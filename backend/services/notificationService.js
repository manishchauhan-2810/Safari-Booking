import Booking from "../models/Booking.js";
import { generateInvoicePdf } from "./invoiceService.js";
import { buildConfirmationEmail } from "./emailTemplate.js";
import { isMailConfigured, sendMail } from "./mailService.js";
import { getSettingsCached } from "../utils/settingsCache.js";

export const MAX_EMAIL_ATTEMPTS = 5;
const STALE_CLAIM_MS = 5 * 60 * 1000; // a "sending" claim older than this is considered crashed

/**
 * Sends the confirmation email + invoice PDF exactly once per booking.
 * The atomic claim means verify, webhook and the retry job can all call this safely.
 * outcomes: sent | skipped | failed | disabled
 */
export const sendConfirmationEmail = async (bookingCode, { force = false } = {}) => {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP is not configured; confirmation email not sent");
    return { outcome: "disabled" };
  }

  const staleDate = new Date(Date.now() - STALE_CLAIM_MS);
  const filter = force
    ? { bookingCode, status: "confirmed", $or: [{ emailStatus: { $ne: "sending" } }, { emailClaimedAt: { $lt: staleDate } }] }
    : {
        bookingCode,
        status: "confirmed",
        emailAttempts: { $not: { $gte: MAX_EMAIL_ATTEMPTS } },
        $or: [{ emailStatus: { $in: ["pending", "failed", null] } }, { emailStatus: "sending", emailClaimedAt: { $lt: staleDate } }],
      };

  const booking = await Booking.findOneAndUpdate(
    filter,
    { $set: { emailStatus: "sending", emailClaimedAt: new Date() }, $inc: { emailAttempts: 1 } },
    { returnDocument: "after" }
  ).populate("zone", "name slug");

  if (!booking) return { outcome: "skipped" }; // already sent, in progress, not confirmed or out of attempts

  try {
    const settings = await getSettingsCached();
    const timingText = settings?.shiftTimings?.[booking.shift] || "";

    const pdf = await generateInvoicePdf(booking, { timingText });
    const { subject, html, text } = buildConfirmationEmail(booking, { timingText });

    await sendMail({
      to: booking.contact.email,
      subject,
      html,
      text,
      attachments: [{ filename: `Invoice-${booking.bookingCode}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch (err) {
    const reason = String(err?.message || err).slice(0, 200); // never log personal data
    console.error(`[mail] ${bookingCode} failed (attempt ${booking.emailAttempts}): ${reason}`);
    await Booking.updateOne({ _id: booking._id }, { $set: { emailStatus: "failed", emailLastError: reason } });
    return { outcome: "failed" };
  }

  await Booking.updateOne(
    { _id: booking._id },
    { $set: { emailStatus: "sent", emailSentAt: new Date() }, $unset: { emailLastError: "" } }
  );
  console.log(`[mail] ${bookingCode} confirmation sent`);
  return { outcome: "sent" };
};

// Fire and forget: never blocks or breaks the payment response
export const queueConfirmationEmail = (bookingCode) => {
  sendConfirmationEmail(bookingCode).catch((err) => console.error("[mail] unexpected error:", err.message));
};

// For the dashboard's "Resend invoice" button
export const resendConfirmation = (bookingCode) => sendConfirmationEmail(bookingCode, { force: true });