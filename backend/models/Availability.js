import mongoose from "mongoose";

export const capacityError = (vehicleType, totalUnits) => {
  if (!Number.isInteger(totalUnits) || totalUnits < 0) return "totalUnits must be a non-negative integer";
  if (vehicleType === "canter" && totalUnits % 16 !== 0) return "Canter totalUnits must be a multiple of 16 (one canter = 16 seats)";
  return null;
};

const availabilitySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD (IST)
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
    shift: { type: String, enum: ["morning", "evening"], required: true },
    vehicleType: { type: String, enum: ["jeep", "canter"], required: true },
    totalUnits: { type: Number, required: true, min: 0 }, // jeeps, or canter SEATS
    bookedUnits: { type: Number, default: 0, min: 0 },
    heldUnits: { type: Number, default: 0, min: 0 },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

availabilitySchema.index({ date: 1, zone: 1, shift: 1, vehicleType: 1 }, { unique: true });
availabilitySchema.index({ date: 1, vehicleType: 1 });

availabilitySchema.virtual("available").get(function () {
  return this.totalUnits - this.bookedUnits - this.heldUnits;
});

availabilitySchema.pre("validate", function () {
  const msg = capacityError(this.vehicleType, this.totalUnits);
  if (msg) this.invalidate("totalUnits", msg);
});

// Update paths skip document validators, so guard totalUnits here when the vehicle type is known.
// (bulkWrite bypasses hooks; the admin controller validates before it writes.)
availabilitySchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
  const update = this.getUpdate() || {};
  const values = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
  if (values.totalUnits === undefined) return;
  const vehicleType = values.vehicleType ?? this.getFilter().vehicleType;
  const msg = vehicleType ? capacityError(vehicleType, values.totalUnits) : capacityError("jeep", values.totalUnits);
  if (msg) throw Object.assign(new Error(msg), { statusCode: 400, isOperational: true });
});

export default mongoose.model("Availability", availabilitySchema);