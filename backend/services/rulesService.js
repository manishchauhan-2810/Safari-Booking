import Zone from "../models/Zone.js";
import ApiError from "../utils/ApiError.js";

/**
 * Children age constraint (5-12) and Adult (above 12)
 * are handled in Zod schema during booking creation.
 */
export const validateComposition = async ({ vehicleType, zone, adultsCount, childrenCount }) => {
  const zoneDoc = await Zone.findById(zone);
  if (!zoneDoc) throw new ApiError(404, "Zone not found");
  if (!zoneDoc.isActive) throw new ApiError(400, "Zone is inactive");

  if (vehicleType === "jeep") {
    if (adultsCount < 1 || adultsCount > 6) throw new ApiError(400, "Jeep requires 1-6 adults");
    if (adultsCount + childrenCount > 8) throw new ApiError(400, "Jeep total max 8");
  } else if (vehicleType === "canter") {
    if (!zoneDoc.allowsCanter) throw new ApiError(400, "Canter ONLY allowed in Dhikala");
    const totalPeople = adultsCount + childrenCount;
    if (totalPeople < 1 || totalPeople > 16) throw new ApiError(400, "Canter requires 1-16 total people");
  } else {
    throw new ApiError(400, "Invalid vehicle type");
  }
};
