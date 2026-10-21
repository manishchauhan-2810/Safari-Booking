import Availability from "../models/Availability.js";
import ApiError from "../utils/ApiError.js";

const assertUnits = (units) => {
  if (!Number.isInteger(units) || units < 1) throw new ApiError(400, "Invalid number of units");
};

export const unitsForBooking = (b) => (b.vehicleType === "jeep" ? 1 : b.adultsCount + b.childrenCount);

export const findSlotIdForBooking = async (b) => {
  const slot = await Availability.findOne({
    date: b.date,
    shift: b.shift,
    zone: b.zone,
    vehicleType: b.vehicleType,
  })
    .select("_id")
    .lean();
  return slot?._id ?? null;
};

// Atomic: the capacity check lives in the filter, so parallel requests can never oversell.
export const reserveCapacity = async (slotFilter, units) => {
  assertUnits(units);
  const slot = await Availability.findOneAndUpdate(
    {
      ...slotFilter,
      isOpen: true,
      $expr: { $gte: [{ $subtract: ["$totalUnits", { $add: ["$bookedUnits", "$heldUnits"] }] }, units] },
    },
    { $inc: { heldUnits: units } },
    { new: true }
  );
  if (!slot) throw new ApiError(409, "Not enough capacity left for this slot");
  return slot;
};

// held -> booked
export const confirmCapacity = async (slotId, units) => {
  assertUnits(units);
  const slot = await Availability.findOneAndUpdate(
    { _id: slotId, heldUnits: { $gte: units } },
    { $inc: { heldUnits: -units, bookedUnits: units } },
    { new: true }
  );
  if (!slot) throw new ApiError(500, "Failed to confirm capacity (no matching hold)");
  return slot;
};

// Never lets heldUnits go below 0
export const releaseCapacity = async (slotId, units) => {
  assertUnits(units);
  const slot = await Availability.findOneAndUpdate(
    { _id: slotId, heldUnits: { $gte: units } },
    { $inc: { heldUnits: -units } },
    { new: true }
  );
  if (!slot) console.warn(`[inventory] release skipped: slot ${slotId} has fewer than ${units} held units`);
  return slot;
};