import Availability from "../models/Availability.js";
import { DEFAULT_SETTINGS } from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculatePrice, quoteDto } from "../services/pricingService.js";
import { validateComposition } from "../services/rulesService.js";
import { getTodayIST, getDatesOfMonth } from "../utils/date.js";
import ApiError from "../utils/ApiError.js";
import { resolveZone, activeZoneIds, getZoneList } from "../utils/zoneHelper.js";
import { getSettingsCached } from "../utils/settingsCache.js";
import { formatRupees } from "../utils/money.js";

const DEFAULT_TIMING = { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" };
const remainingOf = (s) => Math.max(0, s.totalUnits - s.bookedUnits - s.heldUnits);

export const getZones = asyncHandler(async (req, res) => {
  const { vehicleType } = req.validated;
  const zones = (await getZoneList())
    .filter((z) => z.isActive && (vehicleType !== "canter" || z.allowsCanter))
    .map((z) => ({ _id: z._id, name: z.name, slug: z.slug, category: z.category, allowsCanter: z.allowsCanter, isActive: z.isActive }));
  res.json({ success: true, data: zones });
});

export const getCalendar = asyncHandler(async (req, res) => {
  const { month, vehicleType, zone: zoneParam } = req.validated;
  const dates = getDatesOfMonth(month);
  const today = getTodayIST();

  const zone = await resolveZone(zoneParam);
  if (zoneParam && (!zone || !zone.isActive)) throw new ApiError(404, "Zone not found");

  const query = {
    date: { $gte: dates[0], $lte: dates[dates.length - 1] },
    vehicleType,
    zone: zone ? zone._id : { $in: await activeZoneIds(vehicleType) },
  };

  const rows = await Availability.find(query).select("date isOpen totalUnits bookedUnits heldUnits").lean();

  const byDate = new Map();
  for (const r of rows) {
    const d = byDate.get(r.date) || { open: 0, withSeats: 0, total: 0 };
    d.total += 1;
    if (r.isOpen) {
      d.open += 1;
      if (remainingOf(r) > 0) d.withSeats += 1;
    }
    byDate.set(r.date, d);
  }

  const data = dates.map((date) => {
    let status = "no_slots";
    if (date < today) status = "past";
    else {
      const d = byDate.get(date);
      if (d) status = d.open === 0 ? "closed" : d.withSeats > 0 ? "available" : "sold_out";
    }
    return { date, status };
  });

  res.json({ success: true, data });
});

export const getSlots = asyncHandler(async (req, res) => {
  const { date, vehicleType, zone: zoneParam } = req.validated;
  if (date < getTodayIST()) return res.json({ success: true, data: [] });

  const zone = await resolveZone(zoneParam);
  if (zoneParam && (!zone || !zone.isActive)) throw new ApiError(404, "Zone not found");

  const query = {
    date,
    vehicleType,
    zone: zone ? zone._id : { $in: await activeZoneIds(vehicleType) },
  };

  const [slots, zones, settings] = await Promise.all([
    Availability.find(query).select("zone shift isOpen totalUnits bookedUnits heldUnits").lean(),
    getZoneList(),
    getSettingsCached(),
  ]);
  const zoneById = new Map(zones.map((z) => [String(z._id), z]));
  const timings = { ...DEFAULT_TIMING, ...(settings?.shiftTimings || {}) };

  // Only what customers need. Booked/held/total counts are private sales data.
  const data = slots
    .filter((s) => zoneById.has(String(s.zone)))
    .map((s) => {
      const z = zoneById.get(String(s.zone));
      const left = remainingOf(s);
      return {
        zone: { id: z._id, name: z.name, slug: z.slug },
        shift: s.shift,
        timingText: timings[s.shift] || DEFAULT_TIMING[s.shift],
        isOpen: s.isOpen,
        remaining: left,
        canterSeatsLeft: vehicleType === "canter" ? left : null,
      };
    });
  res.json({ success: true, data });
});

export const getQuote = asyncHandler(async (req, res) => {
  const { vehicleType, zone: zoneParam, date, shift, travellers } = req.validated;
  if (date < getTodayIST()) throw new ApiError(400, "Date cannot be in the past");

  const zone = await resolveZone(zoneParam);
  if (!zone || !zone.isActive) throw new ApiError(404, "Zone not found");

  const slot = await Availability.findOne({ date, shift, zone: zone._id, vehicleType }).lean();
  if (!slot) throw new ApiError(404, "Slot not found");
  if (!slot.isOpen) throw new ApiError(400, "Slot is closed");

  const requiredCapacity = vehicleType === "jeep" ? 1 : travellers.length;
  if (remainingOf(slot) < requiredCapacity) throw new ApiError(400, "Insufficient capacity");

  const adultsCount = travellers.filter((t) => t.type === "adult").length;
  const childrenCount = travellers.filter((t) => t.type === "child").length;
  await validateComposition({ vehicleType, zone: zone._id, adultsCount, childrenCount });

  const pricing = await calculatePrice({ vehicleType, travellers, zone });
  res.json({ success: true, data: quoteDto(pricing) });
});

// Price list for the booking site's "Prices and zones" card, so it never goes stale
export const getPricing = asyncHandler(async (_req, res) => {
  const s = { ...DEFAULT_SETTINGS, ...((await getSettingsCached()) || {}) };
  const zones = (await getZoneList())
    .filter((z) => z.isActive)
    .map((z) => ({ name: z.name, slug: z.slug, category: z.category, allowsCanter: z.allowsCanter }));
  const money = (paise) => ({ paise, display: formatRupees(paise) });
  res.json({
    success: true,
    data: {
      feePercent: s.feePercent,
      gstPercent: s.gstPercent,
      advancePercent: s.advancePercent,
      main: {
        jeep: { indian: money(s.mainJeepIndianPaise), foreigner: money(s.mainJeepForeignPaise) },
        canter: { indian: money(s.mainCanterIndianPaise), foreigner: money(s.mainCanterForeignPaise) },
      },
      buffer: { jeep: { indian: money(s.bufferJeepIndianPaise), foreigner: money(s.bufferJeepForeignPaise) } },
      zones,
    },
  });
});