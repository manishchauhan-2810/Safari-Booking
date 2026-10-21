import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  feePercent: { type: Number, default: 3 },
  jeepIndianPaise: { type: Number, default: 750000 },
  jeepForeignPaise: { type: Number, default: 1600000 },
  canterIndianPaise: { type: Number, default: 260000 },
  canterForeignPaise: { type: Number, default: 500000 },
  holdMinutes: { type: Number, default: 15 },
  shiftTimings: {
    type: Object,
    default: {
      morning: "6:00 AM - 9:00 AM",
      evening: "2:30 PM - 6:00 PM"
    }
  },
});

export default mongoose.model("Settings", settingsSchema);
