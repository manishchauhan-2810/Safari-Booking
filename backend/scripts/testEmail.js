import "dotenv/config";
import { verifySmtp, sendMail } from "../services/mailService.js";
import { generateInvoicePdf } from "../services/invoiceService.js";
import { buildConfirmationEmail } from "../services/emailTemplate.js";
import { sampleBooking } from "./sampleBooking.js";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npm run mail:test -- you@example.com");
  process.exit(1);
}

try {
  await verifySmtp();
  console.log("SMTP login OK");
  const booking = sampleBooking({ contact: { name: "Test Customer", email: to, mobile: "9876543210" } });
  const { subject, html, text } = buildConfirmationEmail(booking, { timingText: "6:00 AM - 9:00 AM" });
  const pdf = await generateInvoicePdf(booking, { timingText: "6:00 AM - 9:00 AM" });
  const info = await sendMail({ to, subject, html, text, attachments: [{ filename: "Invoice-SAMPLE.pdf", content: pdf }] });
  console.log("Sent:", info.messageId);
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
}