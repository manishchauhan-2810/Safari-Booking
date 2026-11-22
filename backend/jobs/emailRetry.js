import Booking from "../models/Booking.js";
import { MAX_EMAIL_ATTEMPTS, sendConfirmationEmail } from "../services/notificationService.js";
export const retryPendingEmails = async () => {
  const now = Date.now();
  const rows = await Booking.find({
    status: "confirmed",
    confirmedAt: { $gte: new Date(now - 7 * 24 * 3600 * 1000), $lte: new Date(now - 2 * 60 * 1000) },
    emailStatus: { $in: ["pending", "failed", "sending", null] },
    emailAttempts: { $not: { $gte: MAX_EMAIL_ATTEMPTS } },
  })
    .select("bookingCode")
    .limit(20)
    .lean();

  let sent = 0;
  for (const { bookingCode } of rows) {
    const r = await sendConfirmationEmail(bookingCode);
    if (r.outcome === "disabled") break;
    if (r.outcome === "sent") sent++;
  }
  return sent;
};

export const startEmailRetryJob = (intervalMs = 5 * 60_000) => {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await retryPendingEmails();
    } catch (err) {
      console.error("[mail] retry job error:", err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
};

