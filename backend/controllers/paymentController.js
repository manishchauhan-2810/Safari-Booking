import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../utils/signature.js";
import { confirmBookingPayment } from "../services/paymentService.js";
import { queueConfirmationEmail } from "../services/notificationService.js";
import { toBookingSummary } from "../utils/bookingDto.js";

const refundMessage = (code) =>
  `Your payment was received but the safari slot is no longer available. Your booking code is ${code}. Our team will refund you; please contact support with this code.`;

export const verifyPayment = asyncHandler(async (req, res) => {
  const { bookingCode, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.validated;

  const valid = verifyCheckoutSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) throw new ApiError(400, "Invalid payment signature");

  const result = await confirmBookingPayment({
    bookingCode,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  switch (result.outcome) {
    case "confirmed":
      queueConfirmationEmail(bookingCode);
      return res.json({ success: true, message: "Payment verified successfully", data: toBookingSummary(result.booking) });
    case "confirmed_late":
      queueConfirmationEmail(bookingCode);
      return res.json({
        success: true,
        message: "Your hold had expired, but the slot was still free, so your booking is confirmed.",
        data: toBookingSummary(result.booking),
      });
    case "already_processed":
      if (result.booking.status === "confirmed") {
        queueConfirmationEmail(bookingCode); // safe: only sends if it has not been sent yet
        return res.json({ success: true, message: "Payment already verified", data: toBookingSummary(result.booking) });
      }
      return res.status(409).json({ success: false, message: refundMessage(bookingCode) });
    case "needs_refund":
      return res.status(409).json({ success: false, message: refundMessage(bookingCode) });
    case "not_found":
      throw new ApiError(404, "Booking not found");
    case "order_mismatch":
      throw new ApiError(400, "Order ID mismatch");
    default:
      throw new ApiError(409, "This booking cannot be confirmed in its current state");
  }
});

// Mounted with express.raw(), so req.body is a Buffer here
export const handleWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhook] RAZORPAY_WEBHOOK_SECRET is not set; rejecting");
    return res.status(503).json({ success: false, message: "Webhook not configured" });
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!verifyWebhookSignature({ rawBody: req.body, signature, secret })) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  try {
    const payment = event.payload?.payment?.entity;

    if (event.event === "payment.captured" && payment) {
      const bookingCode = payment.notes?.bookingCode;
      if (bookingCode) {
        const result = await confirmBookingPayment({
          bookingCode,
          orderId: payment.order_id,
          paymentId: payment.id,
          amountPaise: payment.amount,
        });
        console.log(`[webhook] ${bookingCode}: ${result.outcome}`);
        if (["confirmed", "confirmed_late", "already_processed"].includes(result.outcome)) {
          queueConfirmationEmail(bookingCode);
        } else {
          console.error(`[webhook] ATTENTION ${bookingCode}: payment ${payment.id} captured but outcome=${result.outcome}`);
        }
      }
    } else if (event.event === "payment.failed" && payment) {
      console.log(`[webhook] payment failed: ${payment.id} (hold kept until expiry)`);
    }
  } catch (err) {
    console.error("[webhook] processing error:", err.message);
    return res.status(500).json({ success: false }); // Razorpay will retry
  }

  return res.status(200).json({ success: true });
};