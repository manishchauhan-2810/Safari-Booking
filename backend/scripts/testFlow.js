import "dotenv/config";
import crypto from "crypto";
import { getTodayIST } from "../utils/date.js";

const API = process.env.API_URL || "http://localhost:3000/api/v1";
const HOLD_ONLY = process.argv.includes("--hold-only");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const date = args[0] || addDays(getTodayIST(), 1);
const zone = args[1] || "jhirna";
const email = "flow-test@example.com";

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`);
  if (!ok) failures++;
};

const call = async (method, path, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
};

const sign = (orderId, paymentId) =>
  crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

const remaining = async () => {
  const r = await call("GET", `/public/availability/slots?date=${date}&vehicleType=jeep&zone=${zone}`);
  return r.json?.data?.find((s) => s.shift === "morning")?.remaining;
};

async function run() {
  console.log(`Testing jeep / ${zone} / ${date} / morning\n`);

  const before = await remaining();
  check("slot exists", typeof before === "number", `remaining=${before}`);
  if (typeof before !== "number") return;

  const create = await call("POST", "/bookings", {
    vehicleType: "jeep", zone, date, shift: "morning",
    contact: { name: "Flow Test", mobile: "9876543210", email },
    travellers: [{ type: "adult", name: "Flow Tester", gender: "Male", age: 30, nationality: "indian", idType: "aadhaar", idNumber: "123456789012" }],
  });
  check("create booking returns 201", create.status === 201, create.json?.message || "");
  const b = create.json?.data;
  if (!b) return;
  check("Razorpay order id returned", String(b.orderId).startsWith("order_"), b.orderId);
  check("order amount = 772500 paise (Rs 7,725)", b.amount === 772500, `amount=${b.amount}`);
  check("one jeep held", (await remaining()) === before - 1);

  if (HOLD_ONLY) {
    console.log(`\nHold created for ${b.bookingCode}. Not paying. Wait for it to expire and check Atlas.`);
    return;
  }

  const paymentId = `pay_TEST${crypto.randomBytes(5).toString("hex")}`;
  const verify = (sig) => call("POST", "/payments/verify", {
    bookingCode: b.bookingCode, razorpay_order_id: b.orderId, razorpay_payment_id: paymentId, razorpay_signature: sig,
  });

  check("tampered signature rejected (400)", (await verify("0".repeat(64))).status === 400);
  check("garbage signature rejected (400)", (await verify("abc")).status === 400);

  const ok = await verify(sign(b.orderId, paymentId));
  check("valid signature confirms (200)", ok.status === 200 && ok.json?.data?.status === "confirmed", ok.json?.message || "");
  check("verify again is idempotent (200)", (await verify(sign(b.orderId, paymentId))).status === 200);
  check("still exactly one jeep used", (await remaining()) === before - 1);

  const got = await call("GET", `/bookings/${b.bookingCode}?email=${email}`);
  check("booking lookup works", got.status === 200);
  check("ID is masked", got.json?.data?.travellers?.[0]?.idNumber?.endsWith("9012") && !JSON.stringify(got.json).includes("123456789012"));
  check("no signature leaked", !JSON.stringify(got.json).includes("razorpaySignature"));
  check("wrong email gives 404", (await call("GET", `/bookings/${b.bookingCode}?email=nobody@example.com`)).status === 404);
}

run()
  .then(() => {
    console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
    process.exit(failures ? 1 : 0);
  })
  .catch((e) => { console.error(e); process.exit(1); });