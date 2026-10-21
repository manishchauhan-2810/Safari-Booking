import Availability from "../models/Availability.js";
import Booking from "../models/Booking.js";
import Zone from "../models/Zone.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { resolveZone } from "../utils/zoneHelper.js";
import { addDays, daysBetween, getDatesOfMonth, getTodayIST, weekdayOf } from "../utils/date.js";
import { logAction } from "../services/auditService.js";

const CHUNK = 500;
const SHIFT_ORDER = { morning: 0, evening: 1 };
const remainingOf = (s) => Math.max(0, s.totalUnits - s.bookedUnits - s.heldUnits);

const toSlotDto = (s) => ({
  _id: s._id,
  date: s.date,
  zone: s.zone?.name ? { id: s.zone._id, name: s.zone.name, slug: s.zone.slug } : { id: s.zone },
  shift: s.shift,
  vehicleType: s.vehicleType,
  isOpen: s.isOpen,
  totalUnits: s.totalUnits,
  bookedUnits: s.bookedUnits,
  heldUnits: s.heldUnits,
  remaining: remainingOf(s),
});

const hasBookingsError = (hits) =>
  new ApiError(409, `${hits.length} slot(s) have confirmed bookings. Closing does not cancel them; send force=true to close anyway.`, {
    code: "HAS_BOOKINGS",
    count: hits.length,
    sample: hits.slice(0, 10),
  });

const chunks = (arr) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));

// ---------- GET /availability/summary ----------
export const summary = asyncHandler(async (req, res) => {
  const { month, vehicleType, zone: zoneParam } = req.validated;
  const dates = getDatesOfMonth(month);

  const match = { date: { $gte: dates[0], $lte: dates[dates.length - 1] }, vehicleType };
  if (zoneParam) {
    const zone = await resolveZone(zoneParam);
    if (!zone) throw new ApiError(404, "Zone not found");
    match.zone = zone._id;
  }

  const inUse = { $add: ["$bookedUnits", "$heldUnits"] };
  const rows = await Availability.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$date",
        totalSlots: { $sum: 1 },
        openSlots: { $sum: { $cond: ["$isOpen", 1, 0] } },
        totalUnits: { $sum: "$totalUnits" },
        bookedUnits: { $sum: "$bookedUnits" },
        heldUnits: { $sum: "$heldUnits" },
        openRemaining: { $sum: { $cond: ["$isOpen", { $max: [0, { $subtract: ["$totalUnits", inUse] }] }, 0] } },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r]));

  const data = dates.map((date) => {
    const r = byDate.get(date);
    if (!r) return { date, status: "no_slots", openSlots: 0, totalSlots: 0, totalUnits: 0, bookedUnits: 0, heldUnits: 0 };
    let status = "open";
    if (r.openSlots === 0) status = "closed";
    else if (r.openRemaining === 0) status = "full";
    else if (r.bookedUnits + r.heldUnits > 0) status = "partial";
    return { date, status, openSlots: r.openSlots, totalSlots: r.totalSlots, totalUnits: r.totalUnits, bookedUnits: r.bookedUnits, heldUnits: r.heldUnits };
  });

  res.json({ success: true, data });
});

// ---------- GET /availability ----------
export const list = asyncHandler(async (req, res) => {
  const { from, to, vehicleType, zone: zoneParam } = req.validated;
  const span = daysBetween(from, to) + 1;
  if (span < 1) throw new ApiError(400, "to must not be before from");
  if (span > 93) throw new ApiError(400, "Date range cannot exceed 93 days");

  const query = { date: { $gte: from, $lte: to } };
  if (vehicleType) query.vehicleType = vehicleType;
  if (zoneParam) {
    const zone = await resolveZone(zoneParam);
    if (!zone) throw new ApiError(404, "Zone not found");
    query.zone = zone._id;
  }

  const slots = await Availability.find(query).populate("zone", "name slug").lean();
  slots.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.zone?.name || "").localeCompare(b.zone?.name || "") ||
      SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift] ||
      a.vehicleType.localeCompare(b.vehicleType)
  );
  res.json({ success: true, data: slots.map(toSlotDto) });
});

// ---------- PATCH /availability/:id ----------
export const patchSlot = asyncHandler(async (req, res) => {
  const { id, isOpen, jeeps, canters, force } = req.validated;

  const slot = await Availability.findById(id);
  if (!slot) throw new ApiError(404, "Slot not found");
  if (slot.date < getTodayIST()) throw new ApiError(400, "Past dates cannot be edited");

  const set = {};
  if (isOpen !== undefined) set.isOpen = isOpen;
  if (jeeps !== undefined) {
    if (slot.vehicleType !== "jeep") throw new ApiError(400, "jeeps applies to jeep slots only");
    set.totalUnits = jeeps;
  }
  if (canters !== undefined) {
    if (slot.vehicleType !== "canter") throw new ApiError(400, "canters applies to canter slots only");
    set.totalUnits = canters * 16;
  }

  const filter = { _id: slot._id };
  if (set.totalUnits !== undefined) {
    const inUse = slot.bookedUnits + slot.heldUnits;
    if (set.totalUnits < inUse) {
      throw new ApiError(409, `Capacity cannot be lower than booked + held (${inUse}).`, { code: "BELOW_IN_USE", inUse });
    }
    filter.$expr = { $lte: [{ $add: ["$bookedUnits", "$heldUnits"] }, set.totalUnits] }; // guards against a hold made a moment ago
  }

  if (isOpen === false && slot.isOpen && !force) {
    const count = await Booking.countDocuments({ status: "confirmed", date: slot.date, zone: slot.zone, shift: slot.shift, vehicleType: slot.vehicleType });
    if (count > 0) throw hasBookingsError([{ date: slot.date, shift: slot.shift, vehicleType: slot.vehicleType, count }]);
  }

  const updated = await Availability.findOneAndUpdate(filter, { $set: set }, { returnDocument: "after" }).populate("zone", "name slug").lean();
  if (!updated) throw new ApiError(409, "The slot changed while you were editing. Reload and try again.");

  logAction(req, "availability_update", `Slot ${slot.date} ${slot.shift} ${slot.vehicleType} updated`, { id, set, force: Boolean(force) });
  res.json({ success: true, data: toSlotDto(updated) });
});

// ---------- PUT /availability/bulk ----------
export const bulkUpdate = asyncHandler(async (req, res) => {
  const b = req.validated;
  const today = getTodayIST();
  if (b.fromDate < today) throw new ApiError(400, "Past dates cannot be edited");
  const span = daysBetween(b.fromDate, b.toDate) + 1;
  if (span < 1) throw new ApiError(400, "toDate must not be before fromDate");
  if (span > 366) throw new ApiError(400, "Date range cannot exceed 366 days");

  const weekdays = new Set(b.weekdays);
  const dates = [];
  for (let i = 0; i < span; i++) {
    const d = addDays(b.fromDate, i);
    if (weekdays.has(weekdayOf(d))) dates.push(d);
  }
  if (!dates.length) throw new ApiError(400, "No dates match the selected weekdays");

  const shifts = [...new Set(b.shifts)];
  const vehicleTypes = [...new Set(b.vehicleTypes)];

  let zones;
  if (b.zones === "all") {
    zones = await Zone.find({}).lean();
  } else {
    const wanted = [...new Set(b.zones.map((z) => z.toLowerCase()))];
    zones = await Zone.find({ slug: { $in: wanted } }).lean();
    const found = new Set(zones.map((z) => z.slug));
    const missing = wanted.filter((z) => !found.has(z));
    if (missing.length) throw new ApiError(404, `Unknown zone: ${missing.join(", ")}`);
  }

  // What changes per vehicle. A vehicle with nothing to change is skipped.
  const plan = {};
  for (const v of vehicleTypes) {
    const set = {};
    if (b.isOpen !== undefined) set.isOpen = b.isOpen;
    if (v === "jeep" && b.jeeps !== undefined) set.totalUnits = b.jeeps;
    if (v === "canter" && b.canters !== undefined) set.totalUnits = b.canters * 16;
    if (Object.keys(set).length) plan[v] = set;
  }
  if (!Object.keys(plan).length) throw new ApiError(400, "Nothing to change for the selected vehicles");

  const closing = b.isOpen === false;
  const result = { matched: 0, created: 0, updated: 0, skipped: 0, conflicts: [] };
  const targets = {};
  for (const v of Object.keys(plan)) {
    targets[v] = v === "canter" ? zones.filter((z) => z.allowsCanter) : zones;
    result.skipped += (zones.length - targets[v].length) * shifts.length * dates.length; // canter outside Dhikala
  }

  // Closing: refuse (change nothing) if confirmed bookings exist, unless forced
  if (closing && !b.force) {
    const hits = new Map();
    for (const v of Object.keys(plan)) {
      const slugById = new Map(targets[v].map((z) => [String(z._id), z.slug]));
      const rows = await Booking.find({
        status: "confirmed", vehicleType: v, zone: { $in: targets[v].map((z) => z._id) }, shift: { $in: shifts }, date: { $in: dates },
      }).select("date zone shift").lean();
      for (const r of rows) hits.set(`${v}|${r.date}|${r.zone}|${r.shift}`, { date: r.date, zone: slugById.get(String(r.zone)), shift: r.shift, vehicleType: v });
    }
    if (hits.size) throw hasBookingsError([...hits.values()]);
  }

  for (const [v, set] of Object.entries(plan)) {
    const vz = targets[v];
    if (!vz.length) continue;
    const slugById = new Map(vz.map((z) => [String(z._id), z.slug]));

    // Step 1: create missing slots (by unique key only; existing slots are never overwritten)
    if (!closing) {
      const ensure = [];
      for (const date of dates) for (const z of vz) for (const shift of shifts) {
        ensure.push({
          updateOne: {
            filter: { date, zone: z._id, shift, vehicleType: v },
            update: { $setOnInsert: { totalUnits: 0, bookedUnits: 0, heldUnits: 0, isOpen: true } },
            upsert: true,
          },
        });
      }
      for (const chunk of chunks(ensure)) result.created += (await Availability.bulkWrite(chunk, { ordered: false })).upsertedCount;
    }

    // Step 2: conditional updates. Capacity can never drop below booked + held.
    const existing = await Availability.find({
      vehicleType: v, zone: { $in: vz.map((z) => z._id) }, shift: { $in: shifts }, date: { $in: dates },
    }).select("date zone shift bookedUnits heldUnits").lean();

    const ops = [];
    for (const s of existing) {
      const inUse = s.bookedUnits + s.heldUnits;
      if (set.totalUnits !== undefined && set.totalUnits < inUse) {
        result.conflicts.push({ date: s.date, zone: slugById.get(String(s.zone)), shift: s.shift, vehicleType: v, inUse, requested: set.totalUnits });
        continue;
      }
      const filter = { _id: s._id };
      if (set.totalUnits !== undefined) filter.$expr = { $lte: [{ $add: ["$bookedUnits", "$heldUnits"] }, set.totalUnits] };
      ops.push({ updateOne: { filter, update: { $set: set } } });
    }
    for (const chunk of chunks(ops)) {
      const r = await Availability.bulkWrite(chunk, { ordered: false });
      result.matched += r.matchedCount;
      result.updated += r.modifiedCount;
    }
  }

  const conflictCount = result.conflicts.length;
  result.conflicts = result.conflicts.slice(0, 200);
  result.conflictCount = conflictCount;

  logAction(req, "availability_bulk", `Bulk ${closing ? "close" : "update"} ${dates[0]}..${dates[dates.length - 1]}`, {
    vehicleTypes, shifts, zones: b.zones, isOpen: b.isOpen, jeeps: b.jeeps, canters: b.canters, force: Boolean(b.force),
    created: result.created, updated: result.updated, skipped: result.skipped, conflicts: conflictCount,
  });
  res.json({ success: true, data: result });
});