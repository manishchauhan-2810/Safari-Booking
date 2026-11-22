import crypto from "crypto";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import { calculatePrice } from "../services/pricingService.js";
import { validateComposition } from "../services/rulesService.js";
import { reserveCapacity, releaseCapacity } from "../services/inventoryService.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { resolveZone } from "../utils/zoneHelper.js";
import { getSettingsCached } from "../utils/settingsCache.js";
import { getTodayIST } from "../utils/date.js";
import { getRazorpay } from "../utils/razorpay.js";
import { toBookingSummary } from "../utils/bookingDto.js";

// One person must not be able to hold every jeep with unpaid bookings
const MAX_PENDING_PER_CUSTOMER = 3;
const newBookingCode = () => `CSB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const createBookingDoc = async (data) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Booking.create({ ...data, bookingCode: newBookingCode() });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.bookingCode) continue; // code collision, retry
      throw err;
    }
  }
  throw new ApiError(500, "Could not generate a booking code");
};

export const createBooking = asyncHandler(async (req, res) => {
  const { vehicleType, zone: zoneParam, date, shift, contact, travellers, paymentOption } = req.validated;

  if (date < getTodayIST()) throw new ApiError(400, "Date cannot be in the past");

  const zone = await resolveZone(zoneParam);
  if (!zone || !zone.isActive) throw new ApiError(404, "Zone not found");

  const slot = await Availability.findOne({ date, shift, zone: zone._id, vehicleType }).select("_id isOpen").lean();
  if (!slot) throw new ApiError(404, "Slot not found");
  if (!slot.isOpen) throw new ApiError(400, "Slot is closed");

  const adultsCount = travellers.filter((t) => t.type === "adult").length;
  const childrenCount = travellers.filter((t) => t.type === "child").length;
  await validateComposition({ vehicleType, zone: zone._id, adultsCount, childrenCount });

  // Everything that can fail cheaply happens BEFORE we take a hold
  const settings = await getSettingsCached();
  const holdMinutes = settings?.holdMinutes || Number(process.env.HOLD_MINUTES) || 15;
  // The client never sends a price: the server decides it from the zone, nationalities and settings
  const price = await calculatePrice({ vehicleType, travellers, zone, paymentOption, settingsOverride: settings });
  const units = vehicleType === "jeep" ? 1 : adultsCount + childrenCount;

  const pending = await Booking.countDocuments({
    status: "pending",
    expiresAt: { $gt: new Date() },
    $or: [{ "contact.email": contact.email }, { "contact.mobile": contact.mobile }],
  });
  if (pending >= MAX_PENDING_PER_CUSTOMER) {
    throw new ApiError(429, "You already have unpaid bookings in progress. Please complete or wait for them to expire before booking again.");
  }

  await reserveCapacity({ _id: slot._id }, units);

  let booking = null;
  let order;
  try {
    booking = await createBookingDoc({
      date, zone: zone._id, shift, vehicleType, adultsCount, childrenCount, travellers, contact,
      paymentOption: price.paymentOption,
      pricing: {
        subtotalPaise: price.subtotalPaise,
        feePaise: price.feePaise,
        gstPaise: price.gstPaise,
        totalPaise: price.totalPaise,
        advancePercent: price.advancePercent,
        payNowPaise: price.payNowPaise,
        balancePaise: price.balancePaise,
      },
      status: "pending",
      expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
    });

    // Razorpay charges only what is due online: the full total, or the advance share
    order = await getRazorpay().orders.create({
      amount: price.payNowPaise,
      currency: "INR",
      receipt: booking.bookingCode,
      notes: { bookingCode: booking.bookingCode, paymentOption: price.paymentOption },
    });

    booking.payment.razorpayOrderId = order.id;
    await booking.save();
  } catch (error) {
    // Undo everything. Flip first so the expiry job can never release the same hold twice.
    let shouldRelease = true;
    if (booking) {
      const flipped = await Booking.findOneAndUpdate({ _id: booking._id, status: "pending" }, { $set: { status: "failed" } });
      shouldRelease = Boolean(flipped);
    }
    if (shouldRelease) await releaseCapacity(slot._id, units).catch((e) => console.error("[booking] release failed:", e.message));

    console.error("[booking] create failed:", error?.error?.description || error?.message || String(error));
    throw error instanceof ApiError ? error : new ApiError(502, "Could not start the payment. Please try again.");
  }

  res.status(201).json({
    success: true,
    data: {
      bookingCode: booking.bookingCode,
      orderId: order.id,
      amount: price.payNowPaise, // what the Razorpay window will charge
      totalPaise: price.totalPaise,
      balancePaise: price.balancePaise,
      paymentOption: price.paymentOption,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      expiresAt: booking.expiresAt,
    },
  });
});

export const getBooking = asyncHandler(async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) throw new ApiError(400, "Email required");

  const booking = await Booking.findOne({ bookingCode: String(req.params.bookingCode) }).populate("zone", "name slug");

  // One generic error for every mismatch so nothing can be probed
  if (!booking || booking.contact.email !== email || booking.status !== "confirmed") throw new ApiError(404, "Booking not found");

  res.json({ success: true, data: toBookingSummary(booking) });
});