import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Availability from "../models/Availability.js";
import Zone from "../models/Zone.js";
import { getTodayIST } from "../utils/date.js";

const DAYS = Number(process.argv[2]) || 60;

const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const slotOp = (date, zone, shift, vehicleType, totalUnits) => ({
  updateOne: {
    filter: { date, zone, shift, vehicleType },
    update: { $setOnInsert: { totalUnits, bookedUnits: 0, heldUnits: 0, isOpen: true } },
    upsert: true,
  },
});

async function run() {
  await connectDB();
  const zones = await Zone.find({ isActive: true });
  const today = getTodayIST();
  const ops = [];

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(today, i);
    for (const zone of zones) {
      for (const shift of ["morning", "evening"]) {
        ops.push(slotOp(date, zone._id, shift, "jeep", 5));
        if (zone.allowsCanter) ops.push(slotOp(date, zone._id, shift, "canter", 32)); // 2 canters
      }
    }
  }

  const res = await Availability.bulkWrite(ops, { ordered: false });
  console.log(`Checked ${ops.length} slots, created ${res.upsertedCount} new (existing slots untouched)`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});