import { getCompany } from "../config/company.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const inr = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0 })}`;
const fmtDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const esc = (value = "") =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const buildConfirmationEmail = (booking, { timingText = "" } = {}) => {
  const company = getCompany();
  const when = `${fmtDate(booking.date)}, ${cap(booking.shift)}${timingText ? ` (${timingText})` : ""}`;
  const zone = booking.zone?.name || "";
  const payNow = booking.pricing.payNowPaise ?? booking.pricing.totalPaise;
  const balance = booking.pricing.balancePaise ?? 0;

  const rows = [
    ["Booking code", booking.bookingCode],
    ["Safari date", when],
    ["Zone", zone],
    ["Vehicle", cap(booking.vehicleType)],
    ["Travellers", `${booking.adultsCount} adult(s)${booking.childrenCount ? `, ${booking.childrenCount} child(ren)` : ""}`],
    ["Amount paid", inr(payNow)],
    ...(balance > 0 ? [["Balance due on safari day", inr(balance)]] : []),
  ];

  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:130px;">${esc(k)}</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${esc(v)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="background:#15803d;padding:22px 24px;color:#ffffff;">
      <div style="font-size:20px;font-weight:bold;">${esc(company.name)}</div>
      <div style="font-size:13px;margin-top:4px;">Booking confirmed</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:#111827;">Hello ${esc(booking.contact.name)},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">Thank you for your booking. Your payment was received and your safari is confirmed. Your invoice is attached to this email as a PDF.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${rowHtml}</table>
      <h3 style="margin:20px 0 8px;font-size:14px;color:#111827;">Please remember</h3>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.6;">
        <li>Carry the same original ID card used for booking, and a hard copy of the permit.</li>
        <li>Mobile phones are prohibited during the safari.</li>
        <li>Do not get down from the vehicle. Walking or trekking is strictly prohibited.</li>
        <li>Safari amounts are non-refundable. Permits are provisional and may be changed by the Forest Department.</li>
      </ul>
      <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">Questions? Contact ${esc(company.email)}${company.phone ? ` or ${esc(company.phone)}` : ""} and quote booking code ${esc(booking.bookingCode)}.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hello ${booking.contact.name},`,
    "",
    "Your payment was received and your safari is confirmed. Your invoice is attached as a PDF.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Carry the same original ID and a hard copy of the permit. Mobile phones are prohibited during the safari.",
    `Support: ${company.email}${company.phone ? `, ${company.phone}` : ""}`,
  ].join("\n");

  return { subject: `Booking confirmed: ${booking.bookingCode} (${fmtDate(booking.date)})`, html, text };
};