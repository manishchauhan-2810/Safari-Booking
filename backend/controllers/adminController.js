import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAction } from "../services/auditService.js";

// A REAL bcrypt hash, so unknown emails cost the same time as wrong passwords
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

const cookieOptions = () => {
  const requested = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(requested) ? requested : "lax";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
  };
};

const toDto = (a) => ({ id: a._id, email: a.email, name: a.name });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated;
  const admin = await Admin.findOne({ email }).select("+passwordHash");

  const match = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);
  if (!admin || !match) throw new ApiError(401, "Invalid email or password");

  const token = jwt.sign({ sub: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: "8h", algorithm: "HS256" });
  res.cookie("admin_token", token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });

  logAction(req, "login", "Admin logged in", {}, admin);
  res.json({ success: true, data: { admin: toDto(admin) } });
});

// Works even when the session already expired, so the browser can always clear the cookie
export const logout = (_req, res) => {
  res.clearCookie("admin_token", cookieOptions());
  res.json({ success: true, message: "Logged out" });
};

export const getMe = (req, res) => {
  res.json({ success: true, data: { admin: toDto(req.admin) } });
};