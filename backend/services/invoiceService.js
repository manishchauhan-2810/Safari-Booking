import PDFDocument from "pdfkit";
import { getCompany } from "../config/company.js";

// pdfkit's built-in fonts have no rupee glyph, so the PDF uses "INR"
const GREEN = "#15803d";
const DARK = "#1f2937";
const GREY = "#6b7280";
const LINE = "#e5e7eb";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ID_LABEL = { aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving Licence", oci: "OCI" };

const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const inr = (paise) =>
  `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
};
const fmtIst = (date) =>
  new Date(date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
const maskId = (id = "") => `${"*".repeat(Math.max(id.length - 4, 0))}${id.slice(-4)}`;

const L = 40;
const W = 515;

export const generateInvoicePdf = (booking, { timingText = "" } = {}) =>
  new Promise((resolve, reject) => {
    const company = getCompany();
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: { Title: `Invoice INV-${booking.bookingCode}`, Author: company.name },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const code = booking.bookingCode;
      let y;

      // ---- header band ----
      doc.rect(0, 0, 595, 90).fill(GREEN);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text(company.name, L, 28, { width: 330, lineBreak: false, ellipsis: true });
      doc.font("Helvetica").fontSize(9).text("Booking Confirmation & Invoice", L, 56);
      doc.font("Helvetica-Bold").fontSize(15).text("INVOICE", L, 26, { width: W, align: "right" });
      doc.font("Helvetica").fontSize(9)
        .text(`Invoice no: INV-${code}`, L, 48, { width: W, align: "right" })
        .text(`Date: ${fmtIst(booking.confirmedAt || booking.createdAt || Date.now())}`, L, 62, { width: W, align: "right" });

      // ---- from / billed to ----
      y = 108;
      doc.fillColor(GREY).font("Helvetica-Bold").fontSize(8).text("FROM", L, y);
      doc.fillColor(DARK).font("Helvetica").fontSize(10).text(
        [company.address, company.gstin ? `GSTIN: ${company.gstin}` : null, company.email, company.phone].filter(Boolean).join("\n") || company.name,
        L, y + 12, { width: 250 }
      );
      doc.fillColor(GREY).font("Helvetica-Bold").fontSize(8).text("BILLED TO", 320, y);
      doc.fillColor(DARK).font("Helvetica").fontSize(10).text(
        `${booking.contact.name}\n${booking.contact.email}\n${booking.contact.mobile}`, 320, y + 12, { width: 235 }
      );

      // ---- safari details box ----
      y = 200;
      doc.roundedRect(L, y, W, 118, 4).fill("#f0fdf4");
      const adults = booking.adultsCount;
      const kids = booking.childrenCount || 0;
      const items = [
        ["BOOKING CODE", code],
        ["SAFARI DATE", fmtDate(booking.date)],
        ["TIMING", `${cap(booking.shift)}${timingText ? ` (${timingText})` : ""}`],
        ["ZONE", booking.zone?.name || "-"],
        ["VEHICLE", cap(booking.vehicleType)],
        ["TRAVELLERS", `${adults} adult${adults === 1 ? "" : "s"}${kids ? `, ${kids} child${kids === 1 ? "" : "ren"}` : ""}`],
      ];
      items.forEach(([label, value], i) => {
        const x = L + 14 + (i % 2) * 250;
        const yy = y + 12 + Math.floor(i / 2) * 34;
        doc.fillColor(GREY).font("Helvetica-Bold").fontSize(8).text(label, x, yy);
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text(value, x, yy + 12, { width: 235, lineBreak: false, ellipsis: true });
      });
      y += 134;

      // ---- travellers table ----
      const ensure = (height) => {
        if (y + height > 780) {
          doc.addPage();
          y = 40;
          return true;
        }
        return false;
      };
      const cols = { n: L + 6, name: L + 28, type: L + 215, ag: L + 268, nat: L + 340, id: L + 408 };
      const tableHeader = () => {
        doc.rect(L, y, W, 20).fill(DARK);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8.5);
        doc.text("#", cols.n, y + 6).text("NAME", cols.name, y + 6).text("TYPE", cols.type, y + 6)
          .text("AGE / GENDER", cols.ag, y + 6).text("NATIONALITY", cols.nat, y + 6).text("ID PROOF", cols.id, y + 6);
        y += 20;
      };
      tableHeader();
      booking.travellers.forEach((t, i) => {
        if (ensure(22)) tableHeader();
        if (i % 2 === 1) doc.rect(L, y, W, 22).fill("#f9fafb");
        doc.fillColor(DARK).font("Helvetica").fontSize(9);
        doc.text(String(i + 1), cols.n, y + 7);
        doc.text(t.name, cols.name, y + 7, { width: 180, lineBreak: false, ellipsis: true });
        doc.text(cap(t.type), cols.type, y + 7);
        doc.text(`${t.age} / ${cap(t.gender)}`, cols.ag, y + 7);
        doc.text(cap(t.nationality), cols.nat, y + 7);
        doc.text(`${ID_LABEL[t.idType] || t.idType}: ${maskId(t.idNumber)}`, cols.id, y + 7, { width: 145, lineBreak: false, ellipsis: true });
        doc.moveTo(L, y + 22).lineTo(L + W, y + 22).strokeColor(LINE).lineWidth(0.5).stroke();
        y += 22;
      });

      // ---- price breakdown ----
      y += 16;
      ensure(120);
      const { subtotalPaise, feePaise, totalPaise } = booking.pricing;
      const pct = subtotalPaise ? Math.round((feePaise / subtotalPaise) * 1000) / 10 : 0;
      const row = (label, value, bold = false) => {
        doc.fillColor(DARK).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10);
        doc.text(label, 290, y, { width: 150 }).text(value, 440, y, { width: 115, align: "right" });
        y += bold ? 20 : 17;
      };
      row("Subtotal", inr(subtotalPaise));
      row(`Handling & gateway (${pct}%)`, inr(feePaise));
      doc.moveTo(290, y).lineTo(555, y).strokeColor(DARK).lineWidth(1).stroke();
      y += 6;
      row("Total paid", inr(totalPaise), true);

      doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(10).text("PAID", L, y - 36);
      doc.fillColor(GREY).font("Helvetica").fontSize(9)
        .text(`Payment ID: ${booking.payment?.razorpayPaymentId || "-"}`, L, y - 22)
        .text("Paid online via Razorpay", L, y - 10);

      // ---- notes ----
      y += 14;
      ensure(110);
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10).text("Important", L, y);
      y += 15;
      const notes = [
        "Carry the same original ID card used during booking, and a hard copy of this permit.",
        "Mobile phones are prohibited during the safari.",
        "Do not get down from the vehicle. Walking or trekking is strictly prohibited.",
        "Entry permits are provisional and can be changed or cancelled by the Forest Department.",
        "Safari amounts are non-refundable.",
        "Guide fee is paid by the guest directly on the spot.",
      ];
      doc.font("Helvetica").fontSize(9).fillColor(GREY);
      notes.forEach((n) => {
        doc.text(`•  ${n}`, L, y, { width: W });
        y += 14;
      });

      y += 8;
      ensure(30);
      doc.fillColor(GREY).fontSize(8).text("This is a computer-generated document and does not require a signature.", L, y, { width: W, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });