import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAction } from "../services/auditService.js";

const FIELDS = ["feePercent", "jeepIndianPaise", "jeepForeignPaise", "canterIndianPaise", "canterForeignPaise", "holdMinutes", "shiftTimings"];
const DEFAULT_TIMINGS = { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" };
const NOTE = "Price and fee changes apply to NEW bookings only. Existing bookings keep the price they were created with.";

// An older Settings document may have no (or empty) timings. Always return usable values.
const pick = (s) => ({
  ...Object.fromEntries(FIELDS.map((k) => [k, s[k]])),
  shiftTimings: {
    morning: s.shiftTimings?.morning || DEFAULT_TIMINGS.morning,
    evening: s.shiftTimings?.evening || DEFAULT_TIMINGS.evening,
  },
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean();
  res.json({ success: true, data: pick(settings) });
});

// Prices live in Settings and are copied into each booking at creation time,
// which is why a change here never touches existing bookings.
export const updateSettings = asyncHandler(async (req, res) => {
  const body = Object.fromEntries(FIELDS.map((k) => [k, req.validated[k]]));
  const before = (await Settings.findOne().lean()) || {};

  const after = await Settings.findOneAndUpdate({}, { $set: body }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).lean();

  const changes = {};
  for (const k of FIELDS) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = { from: before[k] ?? null, to: after[k] };
  }
  logAction(req, "settings_update", `Settings changed: ${Object.keys(changes).join(", ") || "no changes"}`, { changes });

  res.json({ success: true, data: pick(after), message: NOTE });
});