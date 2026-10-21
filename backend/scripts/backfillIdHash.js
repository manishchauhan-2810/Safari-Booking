import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Booking from "../models/Booking.js";
import { decryptField, encryptField, idHash } from "../utils/crypto.js";

await connectDB();
let bookings = 0;
let travellers = 0;

for await (const b of Booking.find({}).select("+travellers.idHash").lean().cursor()) {
  const set = {};
  b.travellers.forEach((t, i) => {
    const plain = decryptField(t.idNumber);
    set[`travellers.${i}.idHash`] = idHash(plain);
    set[`travellers.${i}.idNumber`] = encryptField(plain); // no-op if already encrypted or no key is set
    travellers++;
  });
  if (Object.keys(set).length) {
    await Booking.collection.updateOne({ _id: b._id }, { $set: set });
    bookings++;
  }
}

console.log(`Updated ${bookings} booking(s), ${travellers} traveller(s)`);
await mongoose.disconnect();