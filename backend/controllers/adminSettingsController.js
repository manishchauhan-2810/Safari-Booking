import Settings, { DEFAULT_SETTINGS } from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAction } from "../services/auditService.js";
import { clearSettingsCache } from "../utils/settingsCache.js";

const FIELDS = Object.keys(DEFAULT_SETTINGS);
const NOTE = "Price, fee, GST and advance changes apply to NEW bookings only. Existing bookings keep the amounts they were created with.";

// An older Settings document may lack newer fields: always return usable values
const pick = (s) => {
  const merged = { ...DEFAULT_SETTINGS, ...(s || {}) };
  return {
    ...Object.fromEntries(FIELDS.map((k) => [k, merged[k]])),
    shiftTimings: {
      morning: s?.shiftTimings?.morning || DEFAULT_SETTINGS.shiftTimings.morning,
      evening: s?.shiftTimings?.evening || DEFAULT_SETTINGS.shiftTimings.evening,
    },
  };
};

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean();
  res.json({ success: true, data: pick(settings) });
});

// Prices are copied into each booking when it is created, so a change here never touches existing bookings.
export const updateSettings = asyncHandler(async (req, res) => {
  const body = Object.fromEntries(FIELDS.map((k) => [k, req.validated[k]]));
  const before = pick(await Settings.findOne().lean());

  const after = await Settings.findOneAndUpdate({}, { $set: body }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).lean();
  clearSettingsCache(); // new prices apply immediately on this server

  const changes = {};
  for (const k of FIELDS) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = { from: before[k] ?? null, to: after[k] };
  }
  logAction(req, "settings_update", `Settings changed: ${Object.keys(changes).join(", ") || "no changes"}`, { changes });

  res.json({ success: true, data: pick(after), message: NOTE });
});