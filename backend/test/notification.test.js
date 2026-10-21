import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

vi.mock("../services/mailService.js", () => ({ isMailConfigured: () => true, sendMail: vi.fn() }));

import Booking from "../models/Booking.js";
import Zone from "../models/Zone.js";
import { sendMail } from "../services/mailService.js";
import { sendConfirmationEmail } from "../services/notificationService.js";
import { generateInvoicePdf } from "../services/invoiceService.js";
import { buildConfirmationEmail } from "../services/emailTemplate.js";
import { sampleBooking } from "../scripts/sampleBooking.js";

dotenv.config({ path: ".env.test" });

let zone;

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  if (!/test/i.test(mongoose.connection.name)) throw new Error("Refusing to run on a non-test database");
  await Booking.init();
});

beforeEach(async () => {
  await Booking.deleteMany({});
  await Zone.deleteMany({});
  zone = await Zone.create({ name: "Jhirna", slug: "jhirna" });
  sendMail.mockReset();
  sendMail.mockResolvedValue({ messageId: "x" });
});

afterAll(async () => {
  await mongoose.disconnect();
});

const makeBooking = (o = {}) =>
  Booking.create({
    bookingCode: `CSB-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    date: "2030-01-01", zone: zone._id, shift: "morning", vehicleType: "jeep",
    adultsCount: 1, childrenCount: 0,
    travellers: [{ type: "adult", name: "Test", gender: "male", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }],
    contact: { name: "T", mobile: "9999999999", email: "t@example.com" },
    pricing: { subtotalPaise: 750000, feePaise: 22500, totalPaise: 772500 },
    payment: { razorpayOrderId: "order_X", razorpayPaymentId: "pay_1", status: "paid" },
    status: "confirmed", confirmedAt: new Date(),
    ...o,
  });

describe("confirmation email", () => {
  it("sends exactly once even when called in parallel, with a PDF attached", async () => {
    const b = await makeBooking();
    await Promise.all(Array.from({ length: 6 }, () => sendConfirmationEmail(b.bookingCode)));

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe("t@example.com");
    expect(mail.attachments[0].content.subarray(0, 4).toString()).toBe("%PDF");

    const saved = await Booking.findById(b._id);
    expect(saved.emailStatus).toBe("sent");
    expect(saved.emailSentAt).toBeTruthy();
  });

  it("does not send again once sent", async () => {
    const b = await makeBooking();
    await sendConfirmationEmail(b.bookingCode);
    expect((await sendConfirmationEmail(b.bookingCode)).outcome).toBe("skipped");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("marks failed on SMTP error and succeeds on retry", async () => {
    const b = await makeBooking();
    sendMail.mockRejectedValueOnce(new Error("SMTP down"));

    expect((await sendConfirmationEmail(b.bookingCode)).outcome).toBe("failed");
    let saved = await Booking.findById(b._id);
    expect([saved.emailStatus, saved.emailAttempts]).toEqual(["failed", 1]);

    expect((await sendConfirmationEmail(b.bookingCode)).outcome).toBe("sent");
    saved = await Booking.findById(b._id);
    expect(saved.emailStatus).toBe("sent");
  });

  it("stops retrying after the maximum attempts", async () => {
    const b = await makeBooking({ emailStatus: "failed", emailAttempts: 5 });
    expect((await sendConfirmationEmail(b.bookingCode)).outcome).toBe("skipped");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("never emails unconfirmed bookings", async () => {
    const b = await makeBooking({ status: "pending" });
    expect((await sendConfirmationEmail(b.bookingCode)).outcome).toBe("skipped");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("force resend sends again", async () => {
    const b = await makeBooking();
    await sendConfirmationEmail(b.bookingCode);
    expect((await sendConfirmationEmail(b.bookingCode, { force: true })).outcome).toBe("sent");
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});

describe("email content and PDF", () => {
  it("escapes customer-supplied HTML", () => {
    const { html } = buildConfirmationEmail(sampleBooking({ contact: { name: "<script>alert(1)</script>", email: "a@b.com", mobile: "9876543210" } }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("generates a valid PDF, including many travellers across pages", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ type: "adult", name: `Traveller ${i}`, gender: "male", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }));
    const pdf = await generateInvoicePdf(sampleBooking({ travellers: many }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("masks ID numbers in the PDF text source", async () => {
    const pdf = await generateInvoicePdf(sampleBooking());
    expect(pdf.toString("latin1")).not.toContain("123456789012");
  });
});