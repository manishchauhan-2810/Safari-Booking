import Zone from "../models/Zone.js";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// Accepts a zone slug or a Mongo _id
export const resolveZone = async (zoneParam) => {
  if (!zoneParam || typeof zoneParam !== "string") return null;
  if (OBJECT_ID.test(zoneParam)) {
    const zone = await Zone.findById(zoneParam);
    if (zone) return zone;
  }
  return Zone.findOne({ slug: zoneParam.toLowerCase() });
};

export const activeZoneIds = (vehicleType) =>
  Zone.distinct("_id", { isActive: true, ...(vehicleType === "canter" ? { allowsCanter: true } : {}) });