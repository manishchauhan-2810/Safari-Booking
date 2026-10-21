import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import app from "../app.js";
import Admin from "../models/Admin.js";
import Booking from "../models/Booking.js";
import Zone from "../models/Zone.js";

const API = "/api/v1";
let zone;

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  if (!/test/i.test(mongoose.connection.name)) throw new Error("Refusing to run on a non-test database");
  await Promise.all([Admin.init(), Booking.init(), Zone.init()]);
});

beforeEach(async () => {
  await Promise.all([Admin, Booking, Zone].map((m) => m.deleteMany({})));
  await Admin.create({ email: "admin@test.com", passwordHash: await bcrypt.hash("Str0ng-Test-Password", 4), name: "A" });
  zone = await Zone.create({ name: "Jhirna", slug: "jhirna" });
});

afterAll(async () => { await mongoose.disconnect(); });

const mk = (o = {}) =>
  Booking.create({
    bookingCode: `CSB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    date: "2030-01-01", zone: zone._id, shift: "morning", vehicleType: "jeep", adultsCount: 1, childrenCount: 0,
    travellers: [{ type: "adult", name: "Asha Verma", gender: "female", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }],
    contact: { name: "Asha Verma", mobile: "9876543210", email: "asha@example.com" },
    pricing: { subtotalPaise: 750000, feePaise: 22500, totalPaise: 772500 },
    status: "confirmed", confirmedAt: new Date(), ...o,
  });

const login = async () => {
  const agent = request.agent(app);
  await agent.post(`${API}/admin/login`).send({ email: "admin@test.com", password: "Str0ng-Test-Password" });
  return agent;
};

describe("admin bookings", () => {
  it("requires login", async () => {
    expect((await request(app).get(`${API}/admin/bookings`)).status).toBe(401);
  });

  it("searches by name, code, mobile, email and the full ID number, and never lists ID numbers", async () => {
    const a = await mk();
    await mk({
      contact: { name: "Rohit Rana", mobile: "9000000001", email: "rohit@example.com" },
      travellers: [{ type: "adult", name: "Rohit Rana", gender: "male", age: 30, nationality: "foreigner", idType: "passport", idNumber: "K1234567" }],
    });
    const agent = await login();
    const find = async (q) => (await agent.get(`${API}/admin/bookings`).query({ q })).body.data;

    expect((await find("asha")).total).toBe(1);
    expect((await find(a.bookingCode.slice(0, 8))).total).toBe(1);
    expect((await find("98765")).total).toBe(1);
    expect((await find("rohit@")).total).toBe(1);
    expect((await find("1234 5678 9012")).total).toBe(1);   // Aadhaar, spaces ignored
    expect((await find("k1234567")).total).toBe(1);          // passport, any case
    expect((await find("123456789013")).total).toBe(0);
    expect((await find("jhirna")).total).toBe(2);            // zone name

    const all = await agent.get(`${API}/admin/bookings`);
    expect(JSON.stringify(all.body)).not.toContain("123456789012");
  });

  it("paginates and treats special characters literally", async () => {
    for (let i = 0; i < 5; i++) await mk();
    const agent = await login();
    const p1 = (await agent.get(`${API}/admin/bookings`).query({ limit: 2, page: 1 })).body.data;
    const p3 = (await agent.get(`${API}/admin/bookings`).query({ limit: 2, page: 3 })).body.data;
    expect([p1.total, p1.pages, p1.items.length, p3.items.length]).toEqual([5, 3, 2, 1]);
    expect((await agent.get(`${API}/admin/bookings`).query({ q: ".*" })).body.data.total).toBe(0);
  });

  it("detail returns the full ID number to a logged-in admin", async () => {
    const b = await mk();
    const agent = await login();
    const res = await agent.get(`${API}/admin/bookings/${b._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.travellers[0].idNumber).toBe("123456789012");
  });
});