import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Zone from "../models/Zone.js";
import Admin from "../models/Admin.js";
import Settings from "../models/Settings.js";

const RESET_PASSWORD = process.argv.includes("--reset-password");

const zones = [
  { name: "Bijrani", slug: "bijrani", allowsCanter: false },
  { name: "Jhirna", slug: "jhirna", allowsCanter: false },
  { name: "Dhela", slug: "dhela", allowsCanter: false },
  { name: "Garjiya", slug: "garjiya", allowsCanter: false },
  { name: "Durgadevi", slug: "durgadevi", allowsCanter: false },
  { name: "Phato", slug: "phato", allowsCanter: false },
  { name: "Sitabani", slug: "sitabani", allowsCanter: false },
  { name: "Bhandarpani", slug: "bhandarpani", allowsCanter: false },
  { name: "Dhikala", slug: "dhikala", allowsCanter: true },
];

async function seed() {
  await connectDB();

  for (const zone of zones) await Zone.findOneAndUpdate({ slug: zone.slug }, zone, { upsert: true });
  console.log("Zones seeded");

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in .env");
  }
  const existing = await Admin.findOne({ email });
  if (!existing) {
    await Admin.create({ email, passwordHash: await bcrypt.hash(password, 12), name: "Admin" });
    console.log("Admin created");
  } else if (RESET_PASSWORD) {
    existing.passwordHash = await bcrypt.hash(password, 12);
    await existing.save();
    console.log("Admin password reset");
  } else {
    console.log("Admin already exists (use --reset-password to change the password)");
  }

  await Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, setDefaultsOnInsert: true });
  console.log("Settings seeded");
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });