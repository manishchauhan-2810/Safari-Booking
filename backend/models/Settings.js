import mongoose from "mongoose";

// All money in paise. Used as the source of truth when an older Settings document lacks a field.
export const DEFAULT_SETTINGS = {
  mainJeepIndianPaise: 750000, // Rs 7,500
  mainJeepForeignPaise: 1260000, // Rs 12,600
  mainCanterIndianPaise: 252000, // Rs 2,520 per person
  mainCanterForeignPaise: 504000, // Rs 5,040 per person
  bufferJeepIndianPaise: 550000, // Rs 5,500
  bufferJeepForeignPaise: 700000, // Rs 7,000
  feePercent: 3, // platform fee, on the base price
  gstPercent: 5, // GST, on the base price
  advancePercent: 70, // share of the total paid online when the customer chooses "advance"
  holdMinutes: 15,
  shiftTimings: { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" },
};

export const PRICE_FIELDS = [
  "mainJeepIndianPaise",
  "mainJeepForeignPaise",
  "mainCanterIndianPaise",
  "mainCanterForeignPaise",
  "bufferJeepIndianPaise",
  "bufferJeepForeignPaise",
];

const D = DEFAULT_SETTINGS;
const num = (def) => ({ type: Number, default: def });

const settingsSchema = new mongoose.Schema({
  mainJeepIndianPaise: num(D.mainJeepIndianPaise),
  mainJeepForeignPaise: num(D.mainJeepForeignPaise),
  mainCanterIndianPaise: num(D.mainCanterIndianPaise),
  mainCanterForeignPaise: num(D.mainCanterForeignPaise),
  bufferJeepIndianPaise: num(D.bufferJeepIndianPaise),
  bufferJeepForeignPaise: num(D.bufferJeepForeignPaise),
  feePercent: num(D.feePercent),
  gstPercent: num(D.gstPercent),
  advancePercent: num(D.advancePercent),
  holdMinutes: num(D.holdMinutes),
  shiftTimings: { type: Object, default: D.shiftTimings },
});

export default mongoose.model("Settings", settingsSchema);