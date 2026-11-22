import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Zone from "../models/Zone.js";
import Admin from "../models/Admin.js";
import Settings, { DEFAULT_SETTINGS, PRICE_FIELDS } from "../models/Settings.js";

const RESET_PASSWORD = process.argv.includes("--reset-password");
const RESET_PRICES = process.argv.includes("--reset-prices");

const zones = [
  { name: "Bijrani", slug: "bijrani", category: "main", allowsCanter: false },
  { name: "Jhirna", slug: "jhirna", category: "main", allowsCanter: false },
  { name: "Garjiya", slug: "garjiya", category: "main", allowsCanter: false },
  { name: "Dhela", slug: "dhela", category: "main", allowsCanter: false },
  { name: "Dhikala", slug: "dhikala", category: "main", allowsCanter: true },
  { name: "Durgadevi", slug: "durgadevi", category: "main", allowsCanter: false },
  { name: "Phanto", slug: "phanto", category: "buffer", allowsCanter: false },
  { name: "Sitabani", slug: "sitabani", category: "buffer", allowsCanter: false },
  { name: "Mohan", slug: "mohan", category: "buffer", allowsCanter: false },
];

// Zones we no longer offer: hidden (not deleted) so old bookings still show their zone name
const RETIRED = ["phato", "bhandarpani", "hathidangar"];
const OLD_PRICE_FIELDS = ["jeepIndianPaise", "jeepForeignPaise", "canterIndianPaise", "canterForeignPaise"];

async function seed() {
  await connectDB();

  for (const zone of zones) {
    await Zone.findOneAndUpdate({ slug: zone.slug }, { $set: { ...zone, isActive: true } }, { upsert: true });
  }
  console.log(`Zones seeded (${zones.length})`);

  const hidden = await Zone.updateMany({ slug: { $in: RETIRED } }, { $set: { isActive: false } });
  console.log(`Retired zones hidden: ${RETIRED.join(", ")} (${hidden.modifiedCount} changed)`);

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

  // Settings: create, or migrate an older document
  const settings = await Settings.collection.findOne({});
  if (!settings) {
    await Settings.create({});
    console.log("Settings created with the current default prices");
  } else {
    const set = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([k]) => settings[k] === undefined));
    if (RESET_PRICES) for (const k of PRICE_FIELDS) set[k] = DEFAULT_SETTINGS[k];
    const unset = Object.fromEntries(OLD_PRICE_FIELDS.filter((k) => settings[k] !== undefined).map((k) => [k, ""]));

    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) await Settings.collection.updateOne({ _id: settings._id }, update);
    console.log(`Settings migrated (set: ${Object.keys(set).join(", ") || "none"}; removed: ${Object.keys(unset).join(", ") || "none"})`);
    if (!RESET_PRICES) console.log("Prices were left as they are. Use --reset-prices to apply the default prices.");
  }
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });