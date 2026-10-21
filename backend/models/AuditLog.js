import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  adminEmail: String,
  action: { type: String, required: true, index: true },
  summary: { type: String, required: true, maxlength: 300 },
  meta: Object,
  ip: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model("AuditLog", auditLogSchema);