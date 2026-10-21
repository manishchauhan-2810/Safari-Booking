import Booking from "../models/Booking.js";
import Zone from "../models/Zone.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { decryptField, idHash, normalizeId } from "../utils/crypto.js";
import { formatRupees } from "../utils/money.js";
import { logAction } from "../services/auditService.js";
import { resendConfirmation } from "../services/notificationService.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  safari_asc: { date: 1, _id: 1 },
  safari_desc: { date: -1, _id: -1 },
};

const safeDecrypt = (v) => {
  try {
    return decryptField(v);
  } catch {
    return "(unreadable: check DATA_ENCRYPTION_KEY)";
  }
};

const toListItem = (b) => ({
  id: b._id,
  bookingCode: b.bookingCode,
  status: b.status,
  date: b.date,
  shift: b.shift,
  vehicleType: b.vehicleType,
  zone: b.zone?.name || "",
  adultsCount: b.adultsCount,
  childrenCount: b.childrenCount,
  contact: b.contact,
  travellerNames: b.travellers.map((t) => t.name),
  totalPaise: b.pricing.totalPaise,
  total: formatRupees(b.pricing.totalPaise),
  paymentStatus: b.payment?.status,
  paymentId: b.payment?.razorpayPaymentId || "",
  emailStatus: b.emailStatus,
  createdAt: b.createdAt,
  confirmedAt: b.confirmedAt,
});

// ---------- GET /bookings ----------
export const list = asyncHandler(async (req, res) => {
  const { page, limit, q, status, vehicleType, from, to, sort } = req.validated;
  const filter = {};

  if (status && status !== "all") filter.status = status;
  if (vehicleType) filter.vehicleType = vehicleType;
  if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const zoneIds = await Zone.find({ name: rx }).distinct("_id");
    const or = [
      { bookingCode: rx },
      { "contact.name": rx },
      { "contact.email": rx },
      { "contact.mobile": rx },
      { "travellers.name": rx },
      { "payment.razorpayPaymentId": rx },
      { "payment.razorpayOrderId": rx },
    ];
    if (zoneIds.length) or.push({ zone: { $in: zoneIds } });
    // Full ID numbers are matched through the blind index (exact match only)
    if (normalizeId(q).length >= 6) or.push({ "travellers.idHash": idHash(q) });
    filter.$or = or;
  }

  const total = await Booking.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limit));
  const rows = await Booking.find(filter)
    .select("-travellers.idNumber -travellers.idHash")
    .populate("zone", "name slug")
    .sort(SORTS[sort])
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ success: true, data: { items: rows.map(toListItem), total, page, limit, pages } });
});

// ---------- GET /bookings/:id ----------
export const detail = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.validated.id).populate("zone", "name slug").lean();
  if (!b) throw new ApiError(404, "Booking not found");

  // Full ID numbers leave the server only here, and every view is recorded
  logAction(req, "booking_view", `Viewed booking ${b.bookingCode} (including ID numbers)`, { bookingCode: b.bookingCode });

  res.json({
    success: true,
    data: {
      ...toListItem(b),
      pricing: {
        subtotal: formatRupees(b.pricing.subtotalPaise),
        fee: formatRupees(b.pricing.feePaise),
        total: formatRupees(b.pricing.totalPaise),
      },
      payment: { status: b.payment?.status, orderId: b.payment?.razorpayOrderId || "", paymentId: b.payment?.razorpayPaymentId || "" },
      emailAttempts: b.emailAttempts,
      emailSentAt: b.emailSentAt,
      emailLastError: b.emailLastError || "",
      travellers: b.travellers.map((t) => ({
        type: t.type,
        name: t.name,
        gender: t.gender,
        age: t.age,
        nationality: t.nationality,
        idType: t.idType,
        idNumber: safeDecrypt(t.idNumber),
      })),
    },
  });
});

// ---------- POST /bookings/:id/resend-email ----------
export const resendEmail = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.validated.id).select("bookingCode status").lean();
  if (!b) throw new ApiError(404, "Booking not found");
  if (b.status !== "confirmed") throw new ApiError(409, "Only confirmed bookings can be emailed");

  const { outcome } = await resendConfirmation(b.bookingCode);
  logAction(req, "booking_resend_email", `Resent invoice for ${b.bookingCode}: ${outcome}`, { bookingCode: b.bookingCode, outcome });

  if (outcome === "disabled") throw new ApiError(503, "Email is not configured on the server");
  if (outcome === "failed") throw new ApiError(502, "The email could not be sent. Check the server logs.");
  if (outcome === "skipped") throw new ApiError(409, "An email is already being sent for this booking. Try again in a minute.");
  res.json({ success: true, message: "Invoice sent" });
});