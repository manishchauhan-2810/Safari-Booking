import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Availability from "../models/Availability.js";
import Booking from "../models/Booking.js";
import { unitsForBooking } from "../services/inventoryService.js";

const FIX = process.argv.includes("--fix");
const key = (o) => [o.date, String(o.zone), o.shift, o.vehicleType].join("|");

async function run() {
  await connectDB();
  const expected = new Map();
  for (const b of await Booking.find({ status: "pending" }).lean()) {
    expected.set(key(b), (expected.get(key(b)) || 0) + unitsForBooking(b));
  }

  let drift = 0;
  for (const s of await Availability.find({}).select("date zone shift vehicleType heldUnits").lean()) {
    const want = expected.get(key(s)) || 0;
    if (s.heldUnits !== want) {
      drift++;
      console.log(`DRIFT ${s.date} ${s.shift} ${s.vehicleType} zone=${s.zone}: held=${s.heldUnits}, expected=${want}`);
      if (FIX) await Availability.updateOne({ _id: s._id }, { $set: { heldUnits: want } });
    }
  }
  console.log(drift ? `${drift} slot(s) drifted${FIX ? " and were fixed" : " (run with --fix to repair, ideally at a quiet time)"}` : "No drift");
  await mongoose.disconnect();
}

run().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });