import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import app from "../app.js";
import Admin from "../models/Admin.js";
import Zone from "../models/Zone.js";
import Availability from "../models/Availability.js";
import Booking from "../models/Booking.js";
import Settings from "../models/Settings.js";
import { addDays, getTodayIST, getDatesOfMonth } from "../utils/date.js";

const API = "/api/v1";
const EMAIL = "admin@test.com";
const PASSWORD = "Str0ng-Test-Password";
const date = addDays(getTodayIST(), 5);
let jhirna, dhikala, admin;

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  if (!/test/i.test(mongoose.connection.name)) throw new Error("Refusing to run on a non-test database");
  await Promise.all([Admin.init(), Availability.init(), Booking.init(), Zone.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin, Zone, Availability, Booking, Settings].map((m) => m.deleteMany({})));
  admin = await Admin.create({ email: EMAIL, passwordHash: await bcrypt.hash(PASSWORD, 4), name: "Test Admin" });
  [jhirna, dhikala] = await Zone.create([
    { name: "Jhirna", slug: "jhirna" },
    { name: "Dhikala", slug: "dhikala", allowsCanter: true },
  ]);
  await Settings.create({});
});

afterAll(async () => { await mongoose.disconnect(); });

const loginAgent = async () => {
  const agent = request.agent(app);
  const res = await agent.post(`${API}/admin/login`).send({ email: EMAIL, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
};

const makeSlot = (o = {}) =>
  Availability.create({ date, zone: jhirna._id, shift: "morning", vehicleType: "jeep", totalUnits: 5, ...o });

const makeConfirmedBooking = (slot) =>
  Booking.create({
    bookingCode: `CSB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    date: slot.date, zone: slot.zone, shift: slot.shift, vehicleType: slot.vehicleType,
    adultsCount: 1, childrenCount: 0,
    travellers: [{ type: "adult", name: "Test", gender: "male", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }],
    contact: { name: "T", mobile: "9999999999", email: "t@example.com" },
    pricing: { subtotalPaise: 750000, feePaise: 22500, totalPaise: 772500 },
    payment: { razorpayOrderId: "order_X", razorpayPaymentId: "pay_1", status: "paid" },
    status: "confirmed", confirmedAt: new Date(),
  });

describe("admin auth", () => {
  it("logs in with an HttpOnly cookie and never returns the hash", async () => {
    const res = await request(app).post(`${API}/admin/login`).send({ email: "ADMIN@test.com", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toMatch(/admin_token=.*HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("gives an identical 401 for a wrong password and an unknown email", async () => {
    const wrong = await request(app).post(`${API}/admin/login`).send({ email: EMAIL, password: "wrong-password-123" });
    const unknown = await request(app).post(`${API}/admin/login`).send({ email: "nobody@test.com", password: "wrong-password-123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("rejects missing, tampered and expired cookies", async () => {
    expect((await request(app).get(`${API}/admin/me`)).status).toBe(401);
    expect((await request(app).get(`${API}/admin/me`).set("Cookie", "admin_token=not.a.token")).status).toBe(401);
    const expired = jwt.sign({ sub: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await request(app).get(`${API}/admin/me`).set("Cookie", `admin_token=${expired}`)).status).toBe(401);
    const wrongKey = jwt.sign({ sub: String(admin._id) }, "another-secret-another-secret-another");
    expect((await request(app).get(`${API}/admin/me`).set("Cookie", `admin_token=${wrongKey}`)).status).toBe(401);
  });

  it("logout removes access", async () => {
    const agent = await loginAgent();
    expect((await agent.get(`${API}/admin/me`)).status).toBe(200);
    await agent.post(`${API}/admin/logout`);
    expect((await agent.get(`${API}/admin/me`)).status).toBe(401);
  });

  it("rejects state changes from a foreign Origin", async () => {
    const agent = await loginAgent();
    const res = await agent.put(`${API}/admin/settings`).set("Origin", "https://evil.example").send({});
    expect(res.status).toBe(403);
  });
});

describe("admin availability", () => {
  it("summary returns every date of the month with the right statuses", async () => {
    await makeSlot({ bookedUnits: 1 });
    const agent = await loginAgent();
    const month = date.slice(0, 7);
    const res = await agent.get(`${API}/admin/availability/summary?month=${month}&vehicleType=jeep`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(getDatesOfMonth(month).length);
    expect(res.body.data.find((d) => d.date === date).status).toBe("partial");
    expect(res.body.data.find((d) => d.date !== date).status).toBe("no_slots");
  });

  it("bulk creates slots, canters=2 gives 32 seats, and canter skips non-Dhikala zones", async () => {
    const agent = await loginAgent();
    const res = await agent.put(`${API}/admin/availability/bulk`).send({
      fromDate: date, toDate: date, zones: "all", vehicleTypes: ["jeep", "canter"], isOpen: true, jeeps: 4, canters: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(6); // 2 zones x 2 shifts jeep + Dhikala x 2 shifts canter
    expect(res.body.data.skipped).toBe(2); // Jhirna canter x 2 shifts
    const canter = await Availability.findOne({ vehicleType: "canter", zone: dhikala._id, shift: "morning" });
    expect(canter.totalUnits).toBe(32);
    expect(await Availability.countDocuments({ vehicleType: "canter", zone: jhirna._id })).toBe(0);
  });

  it("reports a conflict instead of reducing capacity below booked + held", async () => {
    const slot = await makeSlot({ bookedUnits: 3, heldUnits: 1 });
    const agent = await loginAgent();
    const res = await agent.put(`${API}/admin/availability/bulk`).send({
      fromDate: date, toDate: date, zones: ["jhirna"], shifts: ["morning"], vehicleTypes: ["jeep"], jeeps: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.conflicts).toHaveLength(1);
    expect((await Availability.findById(slot._id)).totalUnits).toBe(5);
  });

  it("closing a slot with a confirmed booking needs force", async () => {
    const slot = await makeSlot({ bookedUnits: 1 });
    await makeConfirmedBooking(slot);
    const agent = await loginAgent();

    const blocked = await agent.patch(`${API}/admin/availability/${slot._id}`).send({ isOpen: false });
    expect(blocked.status).toBe(409);
    expect(blocked.body.details.code).toBe("HAS_BOOKINGS");
    expect((await Availability.findById(slot._id)).isOpen).toBe(true);

    const forced = await agent.patch(`${API}/admin/availability/${slot._id}`).send({ isOpen: false, force: true });
    expect(forced.status).toBe(200);
    expect((await Availability.findById(slot._id)).isOpen).toBe(false);
  });

  it("bulk close is blocked by confirmed bookings and changes nothing", async () => {
    const slot = await makeSlot({ bookedUnits: 1 });
    await makeConfirmedBooking(slot);
    const agent = await loginAgent();
    const res = await agent.put(`${API}/admin/availability/bulk`).send({ fromDate: date, toDate: date, vehicleTypes: ["jeep"], isOpen: false });
    expect(res.status).toBe(409);
    expect((await Availability.findById(slot._id)).isOpen).toBe(true);
  });

  it("PATCH rejects capacity below booked + held, and canters on a jeep slot", async () => {
    const slot = await makeSlot({ bookedUnits: 3, heldUnits: 1 });
    const agent = await loginAgent();
    expect((await agent.patch(`${API}/admin/availability/${slot._id}`).send({ jeeps: 3 })).status).toBe(409);
    expect((await agent.patch(`${API}/admin/availability/${slot._id}`).send({ canters: 1 })).status).toBe(400);
  });

  it("rejects past dates and a malformed id", async () => {
    const agent = await loginAgent();
    const past = await agent.put(`${API}/admin/availability/bulk`).send({ fromDate: "2020-01-01", toDate: "2020-01-02", vehicleTypes: ["jeep"], isOpen: true });
    expect(past.status).toBe(400);
    expect((await agent.patch(`${API}/admin/availability/not-an-id`).send({ isOpen: false })).status).toBe(400);
  });

  it("a closed date shows up as closed on the public calendar immediately", async () => {
    await makeSlot();
    await makeSlot({ shift: "evening" });
    const agent = await loginAgent();
    const close = await agent.put(`${API}/admin/availability/bulk`).send({ fromDate: date, toDate: date, vehicleTypes: ["jeep"], isOpen: false });
    expect(close.status).toBe(200);
    const res = await request(app).get(`${API}/public/availability/calendar?month=${date.slice(0, 7)}&vehicleType=jeep`);
    expect(res.body.data.find((d) => d.date === date).status).toBe("closed");
  });
});

describe("admin settings", () => {
  const valid = {
    feePercent: 3, jeepIndianPaise: 800000, jeepForeignPaise: 1700000, canterIndianPaise: 260000, canterForeignPaise: 500000,
    holdMinutes: 20, shiftTimings: { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" },
  };

  it("rejects an invalid fee and unauthenticated access", async () => {
    const agent = await loginAgent();
    expect((await agent.put(`${API}/admin/settings`).send({ ...valid, feePercent: 50 })).status).toBe(400);
    expect((await request(app).get(`${API}/admin/settings`)).status).toBe(401);
  });

  it("saves valid settings and the public quote uses the new price", async () => {
    const agent = await loginAgent();
    const res = await agent.put(`${API}/admin/settings`).send(valid);
    expect(res.status).toBe(200);
    expect((await Settings.findOne()).jeepIndianPaise).toBe(800000);

    await makeSlot();
    const quote = await request(app).post(`${API}/public/pricing/quote`).send({
      vehicleType: "jeep", zone: "jhirna", date, shift: "morning", travellers: [{ type: "adult", nationality: "indian" }],
    });
    expect(quote.body.data.subtotalPaise).toBe(800000);
    expect(quote.body.data.totalPaise).toBe(824000);
  });
});