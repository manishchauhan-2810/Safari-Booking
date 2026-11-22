import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  // main = Bijrani, Jhirna, Garjiya, Dhela, Dhikala, Durgadevi
  // buffer = Phanto, Sitabani, Mohan
  category: { type: String, enum: ["main", "buffer"], default: "main" },
  allowsCanter: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model("Zone", zoneSchema);