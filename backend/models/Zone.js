import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  allowsCanter: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model("Zone", zoneSchema);
