import { describe, it, expect } from "vitest";
import { calculatePrice } from "../services/pricingService.js";
import { DEFAULT_SETTINGS } from "../models/Settings.js";

const run = (o) => calculatePrice({ settingsOverride: DEFAULT_SETTINGS, ...o });
const main = { category: "main" };
const buffer = { category: "buffer" };
const indian = (n = 1) => Array.from({ length: n }, () => ({ nationality: "indian" }));
const foreign = () => [{ nationality: "indian" }, { nationality: "foreigner" }];
const pick = (r) => [r.subtotalPaise, r.feePaise, r.gstPaise, r.totalPaise];

describe("pricing: jeep", () => {
  it("main zone, Indian: 7500 + 3% + 5% GST = 8100", async () => {
    expect(pick(await run({ vehicleType: "jeep", zone: main, travellers: indian(2) }))).toEqual([750000, 22500, 37500, 810000]);
  });
  it("main zone, any foreigner: 12600 for the whole jeep -> 13608", async () => {
    expect(pick(await run({ vehicleType: "jeep", zone: main, travellers: foreign() }))).toEqual([1260000, 37800, 63000, 1360800]);
  });
  it("buffer zone, Indian: 5500 -> 5940", async () => {
    expect(pick(await run({ vehicleType: "jeep", zone: buffer, travellers: indian() }))).toEqual([550000, 16500, 27500, 594000]);
  });
  it("buffer zone, foreigner: 7000 -> 7560", async () => {
    expect(pick(await run({ vehicleType: "jeep", zone: buffer, travellers: [{ nationality: "foreigner" }] }))).toEqual([700000, 21000, 35000, 756000]);
  });
});

describe("pricing: canter", () => {
  it("3 Indian + 2 foreign in Dhikala (children are full persons): 17640 -> 19051.20", async () => {
    const t = [...indian(3), { nationality: "foreigner" }, { nationality: "foreigner" }];
    expect(pick(await run({ vehicleType: "canter", zone: main, travellers: t }))).toEqual([1764000, 52920, 88200, 1905120]);
  });
  it("16 Indian: 40320 -> 43545.60", async () => {
    expect((await run({ vehicleType: "canter", zone: main, travellers: indian(16) })).totalPaise).toBe(4354560);
  });
  it("is rejected in a buffer zone", async () => {
    await expect(run({ vehicleType: "canter", zone: buffer, travellers: indian() })).rejects.toThrow("Dhikala");
  });
});

describe("pricing: payment options", () => {
  it("full pays everything online", async () => {
    const r = await run({ vehicleType: "jeep", zone: main, travellers: indian(), paymentOption: "full" });
    expect([r.payNowPaise, r.balancePaise]).toEqual([810000, 0]);
  });
  it("advance pays 70% of the TOTAL (8100 -> 5670) and leaves 2430", async () => {
    const r = await run({ vehicleType: "jeep", zone: main, travellers: indian(), paymentOption: "advance" });
    expect([r.payNowPaise, r.balancePaise]).toEqual([567000, 243000]);
  });
  it("advance on buffer jeep: 5940 -> 4158 now, 1782 later", async () => {
    const r = await run({ vehicleType: "jeep", zone: buffer, travellers: indian(), paymentOption: "advance" });
    expect([r.payNowPaise, r.balancePaise]).toEqual([415800, 178200]);
  });
  it("uses the defaults when a stored Settings document lacks the new fields", async () => {
    const r = await calculatePrice({ vehicleType: "jeep", zone: main, travellers: indian(), settingsOverride: { feePercent: 3 } });
    expect(r.totalPaise).toBe(810000);
  });
});