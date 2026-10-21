import Settings from "../models/Settings.js";
import ApiError from "../utils/ApiError.js";

export const calculatePrice = async ({ vehicleType, travellers, settingsOverride = null }) => {
  const settings = settingsOverride || await Settings.findOne();
  if (!settings) {
    throw new ApiError(500, "Settings not configured");
  }

  let subtotalPaise = 0;

  if (vehicleType === "jeep") {
    const hasForeigner = travellers.some(t => t.nationality === "foreigner");
    subtotalPaise = hasForeigner ? settings.jeepForeignPaise : settings.jeepIndianPaise;
  } else if (vehicleType === "canter") {
    travellers.forEach(t => {
      // Children count as full persons
      subtotalPaise += (t.nationality === "foreigner" ? settings.canterForeignPaise : settings.canterIndianPaise);
    });
  }

  const feePaise = Math.round((subtotalPaise * settings.feePercent) / 100);
  const totalPaise = subtotalPaise + feePaise;

  return { subtotalPaise, feePaise, totalPaise };
};
