import Booking from "../models/Booking.js";
import ApiError from "../utils/ApiError.js";
import {
  reserveCapacity,
  confirmCapacity,
  releaseCapacity,
  findSlotIdForBooking,
  unitsForBooking,
} from "./inventoryService.js";

const paidFields = ({ paymentId, signature }) => ({
  "payment.razorpayPaymentId": paymentId,
  "payment.status": "paid",
  ...(signature ? { "payment.razorpaySignature": signature } : {}),
});

const markNeedsRefund = (bookingId, fromStatuses, fields) =>
  Booking.findOneAndUpdate(
    { _id: bookingId, status: { $in: fromStatuses } },
    { $set: { ...fields, status: "paid_needs_refund" } },
    { new: true }
  );

/**
 * Confirms a paid booking. Safe to call many times, in parallel, from verify and webhook.
 * outcomes: confirmed | confirmed_late | already_processed | needs_refund |
 *           not_found | order_mismatch | amount_mismatch | invalid_status
 *
 * Late payments (hold already expired): we try to re-reserve the seat. If it is gone,
 * the booking becomes "paid_needs_refund" and must be refunded manually.
 */
export const confirmBookingPayment = async ({ bookingCode, orderId, paymentId, signature = null, amountPaise = null }) => {
  const booking = await Booking.findOne({ bookingCode });
  if (!booking) return { outcome: "not_found" };
  if (booking.payment?.razorpayOrderId !== orderId) return { outcome: "order_mismatch" };
  if (amountPaise !== null && amountPaise !== booking.pricing.totalPaise) return { outcome: "amount_mismatch", booking };
  if (["confirmed", "paid_needs_refund"].includes(booking.status)) return { outcome: "already_processed", booking };
  if (!["pending", "expired"].includes(booking.status)) return { outcome: "invalid_status", booking };

  const units = unitsForBooking(booking);
  const slotId = await findSlotIdForBooking(booking);
  const fields = paidFields({ paymentId, signature });

  if (!slotId) {
    const b = await markNeedsRefund(booking._id, ["pending", "expired"], fields);
    return { outcome: "needs_refund", booking: b ?? booking };
  }

  // Path A: hold is still ours. The atomic pending -> confirmed flip means only ONE caller wins.
  const confirmed = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "pending" },
    { $set: { ...fields, confirmedAt: new Date(), status: "confirmed" } },
    { new: true }
  );
  if (confirmed) {
    try {
      await confirmCapacity(slotId, units);
    } catch (err) {
      console.error(`[payment] CRITICAL: ${bookingCode} confirmed but hold missing:`, err.message);
      const b = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "confirmed" },
        { $set: { status: "paid_needs_refund" } },
        { new: true }
      );
      return { outcome: "needs_refund", booking: b ?? confirmed };
    }
    return { outcome: "confirmed", booking: confirmed };
  }

  // Path B: the expiry job got there first. Try to take the seat again.
  try {
    await reserveCapacity({ _id: slotId }, units);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    const b = await markNeedsRefund(booking._id, ["expired"], fields);
    return { outcome: "needs_refund", booking: b ?? (await Booking.findById(booking._id)) };
  }

  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "expired" },
    { $set: { ...fields, confirmedAt: new Date(), status: "confirmed" } },
    { new: true }
  );
  if (!claimed) {
    await releaseCapacity(slotId, units); // someone else handled it; give the seat back
    return { outcome: "already_processed", booking: await Booking.findById(booking._id) };
  }
  await confirmCapacity(slotId, units);
  return { outcome: "confirmed_late", booking: claimed };
};