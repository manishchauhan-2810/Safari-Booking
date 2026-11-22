import Zone from "../models/Zone.js";
import { ttlCache } from "./cache.js";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// All zones, main first, cached for a minute
export const getZoneList = ttlCache(async () => {
  const zones = await Zone.find({}).sort({ _id: 1 }).lean();
  const rank = (z) => (z.category === "buffer" ? 1 : 0);
  return zones.map((z, i) => ({ z, i })).sort((a, b) => rank(a.z) - rank(b.z) || a.i - b.i).map((x) => x.z);
}, 60_000);

export const clearZoneCache = () => getZoneList.clear();

// Accepts a zone slug or a Mongo _id. Returns a plain object.
export const resolveZone = async (zoneParam) => {
  if (!zoneParam || typeof zoneParam !== "string") return null;
  const zones = await getZoneList();
  if (OBJECT_ID.test(zoneParam)) {
    const byId = zones.find((z) => String(z._id) === zoneParam);
    if (byId) return byId;
  }
  const slug = zoneParam.toLowerCase();
  return zones.find((z) => z.slug === slug) || null;
};

export const activeZoneIds = async (vehicleType) => {
  const zones = await getZoneList();
  return zones.filter((z) => z.isActive && (vehicleType !== "canter" || z.allowsCanter)).map((z) => z._id);
};