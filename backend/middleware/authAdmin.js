import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const authAdmin = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.admin_token;
  if (!token) throw new ApiError(401, "Unauthorized");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new ApiError(401, "Unauthorized"); // expired, tampered or malformed
  }
  if (typeof payload.sub !== "string" || !/^[0-9a-fA-F]{24}$/.test(payload.sub)) throw new ApiError(401, "Unauthorized");

  // A database error here must stay a 500, not be disguised as a logout
  const admin = await Admin.findById(payload.sub);
  if (!admin) throw new ApiError(401, "Unauthorized");

  req.admin = admin;
  next();
});

// Why this plus SameSite is enough: the session lives only in an httpOnly cookie, and browsers always
// send an Origin header on cross-origin POST/PUT/PATCH/DELETE. We reject any Origin that is not one of
// our own dashboards, so a malicious site cannot make a logged-in admin's browser change data.
// If the dashboard and API are on different registrable domains, SameSite must be "none" (with Secure).
export const csrfGuard = (req, _res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      const allowed = (process.env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!allowed.includes(origin)) return next(new ApiError(403, "Forbidden"));
    }
  }
  next();
};