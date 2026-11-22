import PDFDocument from "pdfkit";
import { getCompany } from "../config/company.js";
import { decryptField } from "../utils/crypto.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cap = (s = "") => String(s).charAt(0).toUpperCase() + String(s).slice(1);

// Helvetica has no rupee glyph, so the PDF uses "Rs"
const inr = (paise = 0) =>
  `Rs ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const fmtDate = (ymd = "") => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(ymd);
};

const plainId = (v) => {
  try {
    return decryptField(v);
  } catch {
    return "";
  }
};

// Only the last 4 characters are ever printed
const maskId = (v) => {
  const id = plainId(v) || "";
  return id ? `${"*".repeat(Math.max(id.length - 4, 4))}${id.slice(-4)}` : "-";
};

const LEFT = 40;
const RIGHT = 555;
const BOTTOM = 780;

export const generateInvoicePdf = (booking, { timingText = "" } = {}) =>
  new Promise((resolve, reject) => {
    try {
      const company = getCompany();
      const doc = new PDFDocument({ size: "A4", margin: LEFT, info: { Title: `Invoice ${booking.bookingCode}` } });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const ensureSpace = (h) => {
        if (doc.y + h > BOTTOM) doc.addPage();
      };

      // ---- Header ----
      doc.rect(0, 0, 595, 80).fill("#15803d");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text(company.name, LEFT, 22, { width: 330 });
      doc.font("Helvetica").fontSize(10).text("INVOICE", 400, 24, { width: 155, align: "right" });
      doc.text(`# ${booking.bookingCode}`, 400, 40, { width: 155, align: "right" });
      doc.text(fmtDate(booking.date ? (booking.confirmedAt ? new Date(booking.confirmedAt).toISOString().slice(0, 10) : booking.date) : ""), 400, 55, {
        width: 155,
        align: "right",
      });

      doc.fillColor("#111827");
      doc.y = 95;
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
      if (company.address) doc.text(company.address, LEFT, doc.y, { width: 300 });
      if (company.gstin) doc.text(`GSTIN: ${company.gstin}`, LEFT, doc.y);
      const contactLine = [company.email, company.phone].filter(Boolean).join("  |  ");
      if (contactLine) doc.text(contactLine, LEFT, doc.y);
      doc.moveDown(1);

      // ---- Booking details ----
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text("Booking details", LEFT, doc.y);
      doc.moveDown(0.4);

      const when = `${fmtDate(booking.date)}, ${cap(booking.shift)}${timingText ? ` (${timingText})` : ""}`;
      const details = [
        ["Customer", booking.contact?.name],
        ["Email", booking.contact?.email],
        ["Mobile", booking.contact?.mobile],
        ["Safari date", when],
        ["Zone", booking.zone?.name || "-"],
        ["Vehicle", cap(booking.vehicleType)],
        ["Travellers", `${booking.adultsCount} adult(s)${booking.childrenCount ? `, ${booking.childrenCount} child(ren)` : ""}`],
        ["Payment ID", booking.payment?.razorpayPaymentId || "-"],
      ];
      for (const [k, v] of details) {
        const y = doc.y;
        doc.font("Helvetica").fontSize(10).fillColor("#6b7280").text(k, LEFT, y, { width: 110 });
        doc.font("Helvetica-Bold").fillColor("#111827").text(String(v ?? "-"), LEFT + 120, y, { width: RIGHT - LEFT - 120 });
      }
      doc.moveDown(1);

      // ---- Travellers table (paginated) ----
      const cols = [
        { label: "#", x: LEFT, w: 25 },
        { label: "Name", x: LEFT + 25, w: 170 },
        { label: "Type", x: LEFT + 195, w: 50 },
        { label: "Age", x: LEFT + 245, w: 35 },
        { label: "Nationality", x: LEFT + 280, w: 80 },
        { label: "ID type", x: LEFT + 360, w: 70 },
        { label: "ID number", x: LEFT + 430, w: 85 },
      ];
      const drawTableHead = () => {
        const y = doc.y;
        doc.rect(LEFT, y - 3, RIGHT - LEFT, 18).fill("#f3f4f6");
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9);
        for (const c of cols) doc.text(c.label, c.x + 2, y + 1, { width: c.w });
        doc.y = y + 20;
      };

      ensureSpace(60);
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text("Travellers", LEFT, doc.y);
      doc.moveDown(0.4);
      drawTableHead();

      (booking.travellers || []).forEach((t, i) => {
        if (doc.y + 18 > BOTTOM) {
          doc.addPage();
          drawTableHead();
        }
        const y = doc.y;
        const cells = [String(i + 1), t.name, cap(t.type), String(t.age ?? ""), cap(t.nationality), String(t.idType || "").replace(/_/g, " "), maskId(t.idNumber)];
        doc.font("Helvetica").fontSize(9).fillColor("#111827");
        cols.forEach((c, idx) => doc.text(cells[idx], c.x + 2, y, { width: c.w - 4, lineBreak: false, ellipsis: true }));
        doc.y = y + 16;
      });
      doc.moveDown(1);

      // ---- Pricing ----
      ensureSpace(150);
      const p = booking.pricing || {};
      const total = p.totalPaise ?? 0;
      const payNow = p.payNowPaise ?? total;
      const balance = p.balancePaise ?? 0;
      const lines = [
        ["Safari charges", inr(p.subtotalPaise)],
        ["Platform fee", inr(p.feePaise)],
        ["GST", inr(p.gstPaise || 0)],
      ];
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Payment summary", LEFT, doc.y);
      doc.moveDown(0.4);
      const row = (label, value, bold = false) => {
        const y = doc.y;
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#111827");
        doc.text(label, LEFT, y, { width: 300 });
        doc.text(value, 400, y, { width: RIGHT - 400, align: "right" });
        doc.y = y + 16;
      };
      lines.forEach(([l, v]) => row(l, v));
      doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor("#e5e7eb").stroke();
      doc.y += 6;
      row("Total", inr(total), true);
      row("Paid online", inr(payNow), true);
      if (balance > 0) row("Balance due on safari day", inr(balance), true);
      doc.moveDown(1);

      // ---- Notes ----
      ensureSpace(90);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Please remember", LEFT, doc.y);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      [
        "Carry the same original ID card used for booking, and a hard copy of the permit.",
        "Mobile phones are prohibited during the safari.",
        "Do not get down from the vehicle. Walking or trekking is strictly prohibited.",
        "Safari amounts are non-refundable. Permits are provisional and may be changed by the Forest Department.",
      ].forEach((n) => doc.text(`- ${n}`, LEFT, doc.y + 2, { width: RIGHT - LEFT }));

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

export default generateInvoicePdf;