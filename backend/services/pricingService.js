import { DEFAULT_SETTINGS } from "../models/Settings.js";
import ApiError from "../utils/ApiError.js";
import { formatRupees } from "../utils/money.js";
import { getSettingsCached } from "../utils/settingsCache.js";

const pct = (base, percent) => Math.round((base * percent) / 100);

export const calculatePrice = async ({ vehicleType, travellers, zone, paymentOption = "full", settingsOverride = null }) => {
  const raw = settingsOverride || (await getSettingsCached());
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  const category = zone?.category || "main";

  let subtotalPaise = 0;
  if (vehicleType === "jeep") {
    const foreign = travellers.some((t) => t.nationality === "foreigner");
    const [indian, foreigner] =
      category === "buffer" ? [s.bufferJeepIndianPaise, s.bufferJeepForeignPaise] : [s.mainJeepIndianPaise, s.mainJeepForeignPaise];
    subtotalPaise = foreign ? foreigner : indian;
  } else if (vehicleType === "canter") {
    if (category !== "main") throw new ApiError(400, "Canter is only available in Dhikala");
    for (const t of travellers) {
      subtotalPaise += t.nationality === "foreigner" ? s.mainCanterForeignPaise : s.mainCanterIndianPaise;
    }
  } else {
    throw new ApiError(400, "Invalid vehicle type");
  }

  const feePaise = pct(subtotalPaise, s.feePercent);
  const gstPaise = pct(subtotalPaise, s.gstPercent);
  const totalPaise = subtotalPaise + feePaise + gstPaise;
  const advancePaise = pct(totalPaise, s.advancePercent);
  const payNowPaise = paymentOption === "advance" ? advancePaise : totalPaise;

  return {
    zoneCategory: category,
    subtotalPaise,
    feePaise,
    gstPaise,
    totalPaise,
    feePercent: s.feePercent,
    gstPercent: s.gstPercent,
    advancePercent: s.advancePercent,
    advancePaise,
    paymentOption,
    payNowPaise,
    balancePaise: totalPaise - payNowPaise,
  };
};

// Shape returned by the public quote API: both payment options, ready to display
export const quoteDto = (p) => ({
  zoneCategory: p.zoneCategory,
  subtotalPaise: p.subtotalPaise,
  feePaise: p.feePaise,
  gstPaise: p.gstPaise,
  totalPaise: p.totalPaise,
  feePercent: p.feePercent,
  gstPercent: p.gstPercent,
  advancePercent: p.advancePercent,
  advancePaise: p.advancePaise,
  balanceAfterAdvancePaise: p.totalPaise - p.advancePaise,
  display: {
    subtotal: formatRupees(p.subtotalPaise),
    fee: formatRupees(p.feePaise),
    gst: formatRupees(p.gstPaise),
    total: formatRupees(p.totalPaise),
    advance: formatRupees(p.advancePaise),
    balance: formatRupees(p.totalPaise - p.advancePaise),
  },
});