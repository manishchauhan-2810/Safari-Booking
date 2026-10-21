import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";
import Availability from "../models/Availability.js";
import Booking from "../models/Booking.js";
import { reserveCapacity, confirmCapacity, releaseCapacity } from "../services/inventoryService.js";
import { confirmBookingPayment } from "../services/paymentService.js";
import { expireHoldsOnce } from "../jobs/expireHolds.js";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../utils/signature.js";

dotenv.config({ path: ".env.test" });

const zoneId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  if (!/test/i.test(mongoose.connection.name)) {
    throw new Error(`Refusing to run: database "${mongoose.connection.name}" does not look like a test database`);
  }
  await Availability.init();
  await Booking.init();
});

beforeEach(async () => {
  await Availability.deleteMany({});
  await Booking.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

const makeSlot = (o = {}) =>
  Availability.create({ date: "2030-01-01", shift: "morning", zone: zoneId, vehicleType: "jeep", totalUnits: 5, ...o });

const makeBooking = (slot, o = {}) =>
  Booking.create({
    bookingCode: `CSB-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    date: slot.date, zone: slot.zone, shift: slot.shift, vehicleType: slot.vehicleType,
    adultsCount: 1, childrenCount: 0,
    travellers: [{ type: "adult", name: "Test", gender: "male", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }],
    contact: { name: "T", mobile: "9999999999", email: "t@example.com" },
    pricing: { subtotalPaise: 750000, feePaise: 22500, totalPaise: 772500 },
    payment: { razorpayOrderId: "order_X1" },
    status: "pending",
    expiresAt: new Date(Date.now() + 60_000),
    ...o,
  });

const pay = (b, extra = {}) => confirmBookingPayment({ bookingCode: b.bookingCode, orderId: "order_X1", paymentId: "pay_1", ...extra });

describe("capacity", () => {
  it("reserves up to capacity, then fails", async () => {
    const slot = await makeSlot();
    for (let i = 0; i < 5; i++) await reserveCapacity({ _id: slot._id }, 1);
    await expect(reserveCapacity({ _id: slot._id }, 1)).rejects.toThrow();
  });

  it("20 parallel reserves on 5 jeeps gives exactly 5 successes", async () => {
    const slot = await makeSlot();
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserveCapacity({ _id: slot._id }, 1)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect((await Availability.findById(slot._id)).heldUnits).toBe(5);
  });

  it("canter reserves one seat per traveller", async () => {
    const slot = await makeSlot({ vehicleType: "canter", totalUnits: 32 });
    await reserveCapacity({ _id: slot._id }, 5);
    await expect(reserveCapacity({ _id: slot._id }, 28)).rejects.toThrow(); // only 27 left
    await reserveCapacity({ _id: slot._id }, 27);
    expect((await Availability.findById(slot._id)).heldUnits).toBe(32);
  });

  it("closed slot cannot be reserved", async () => {
    const slot = await makeSlot({ isOpen: false });
    await expect(reserveCapacity({ _id: slot._id }, 1)).rejects.toThrow();
  });

  it("confirm moves held to booked; release never goes below 0", async () => {
    const slot = await makeSlot({ heldUnits: 2 });
    await confirmCapacity(slot._id, 1);
    let s = await Availability.findById(slot._id);
    expect([s.heldUnits, s.bookedUnits]).toEqual([1, 1]);

    await releaseCapacity(slot._id, 5); // more than held: ignored
    s = await Availability.findById(slot._id);
    expect(s.heldUnits).toBe(1);

    await releaseCapacity(slot._id, 1);
    await releaseCapacity(slot._id, 1);
    s = await Availability.findById(slot._id);
    expect(s.heldUnits).toBe(0);
  });
});

describe("signatures", () => {
  const secret = "test_secret";
  const good = crypto.createHmac("sha256", secret).update("order_1|pay_1").digest("hex");

  it("accepts valid, rejects tampered, wrong length and missing", () => {
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: good, secret })).toBe(true);
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_2", signature: good, secret })).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: "abc", secret })).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: undefined, secret })).toBe(false);
  });

  it("webhook signature uses the raw body", () => {
    const raw = Buffer.from('{"event":"payment.captured"}');
    const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyWebhookSignature({ rawBody: raw, signature: sig, secret })).toBe(true);
    expect(verifyWebhookSignature({ rawBody: Buffer.from("{}"), signature: sig, secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: raw, signature: sig, secret: undefined })).toBe(false);
  });
});

describe("confirmBookingPayment", () => {
  it("confirms once and is idempotent (sequential and parallel)", async () => {
    const slot = await makeSlot({ heldUnits: 1 });
    const b = await makeBooking(slot);

    expect((await pay(b)).outcome).toBe("confirmed");
    expect((await pay(b)).outcome).toBe("already_processed");
    await Promise.all([pay(b), pay(b), pay(b), pay(b)]);

    const s = await Availability.findById(slot._id);
    expect([s.heldUnits, s.bookedUnits]).toEqual([0, 1]);
    expect((await Booking.findById(b._id)).status).toBe("confirmed");
  });

  it("parallel first-time confirmations never double count", async () => {
    const slot = await makeSlot({ heldUnits: 1 });
    const b = await makeBooking(slot);
    await Promise.all(Array.from({ length: 6 }, () => pay(b)));
    const s = await Availability.findById(slot._id);
    expect([s.heldUnits, s.bookedUnits]).toEqual([0, 1]);
  });

  it("rejects order id mismatch and amount mismatch", async () => {
    const slot = await makeSlot({ heldUnits: 1 });
    const b = await makeBooking(slot);
    expect((await pay(b, { orderId: "order_OTHER" })).outcome).toBe("order_mismatch");
    expect((await pay(b, { amountPaise: 100 })).outcome).toBe("amount_mismatch");
    expect((await Booking.findById(b._id)).status).toBe("pending");
  });

  it("late payment re-reserves the seat when it is still free", async () => {
    const slot = await makeSlot();
    const b = await makeBooking(slot, { status: "expired" });
    expect((await pay(b)).outcome).toBe("confirmed_late");
    const s = await Availability.findById(slot._id);
    expect([s.heldUnits, s.bookedUnits]).toEqual([0, 1]);
  });

  it("late payment with no capacity becomes paid_needs_refund", async () => {
    const slot = await makeSlot({ totalUnits: 1, bookedUnits: 1 });
    const b = await makeBooking(slot, { status: "expired" });
    expect((await pay(b)).outcome).toBe("needs_refund");
    expect((await Booking.findById(b._id)).status).toBe("paid_needs_refund");
    expect((await Availability.findById(slot._id)).bookedUnits).toBe(1);
  });
});

describe("expiry job", () => {
  it("expires only stale pending bookings and releases only their hold", async () => {
    const slot = await makeSlot({ heldUnits: 2, bookedUnits: 1 });
    const past = new Date(Date.now() - 60_000);
    const stale = await makeBooking(slot, { expiresAt: past });
    const confirmed = await makeBooking(slot, { status: "confirmed", expiresAt: past });
    const fresh = await makeBooking(slot);

    expect(await expireHoldsOnce()).toBe(1);

    expect((await Booking.findById(stale._id)).status).toBe("expired");
    expect((await Booking.findById(confirmed._id)).status).toBe("confirmed");
    expect((await Booking.findById(fresh._id)).status).toBe("pending");
    expect((await Availability.findById(slot._id)).heldUnits).toBe(1);

    expect(await expireHoldsOnce()).toBe(0); // running again changes nothing
  });
});