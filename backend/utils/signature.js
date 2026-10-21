import crypto from "crypto";

const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Checkout signature: HMAC_SHA256(order_id|payment_id, key_secret)
export const verifyCheckoutSignature = ({ orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET }) => {
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
};

// Webhook signature: HMAC_SHA256(raw body, webhook_secret)
export const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!secret || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
};