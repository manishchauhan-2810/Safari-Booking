import AuditLog from "../models/AuditLog.js";
export const logAction = async (req, action, summary, meta = {}, actor = req.admin) => {
  try {
    await AuditLog.create({
      admin: actor?._id,
      adminEmail: actor?.email,
      action,
      summary: String(summary).slice(0, 300),
      meta,
      ip: req.ip,
    });
  } catch (err) {
    console.error("[audit] failed to log:", err.message);
  }
};