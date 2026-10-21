import { z } from "zod";
import { isRealDate } from "../utils/date.js";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").refine(isRealDate, "Invalid date");
const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Invalid month");
const zoneParam = z.string().trim().min(1).max(50);
const vehicle = z.enum(["jeep", "canter"]);

export const quoteSchema = z.object({
  vehicleType: vehicle,
  zone: zoneParam,
  date: ymd,
  shift: z.enum(["morning", "evening"]),
  travellers: z.array(z.object({ type: z.enum(["adult", "child"]), nationality: z.enum(["indian", "foreigner"]) })).min(1).max(16),
});

export const zonesSchema = z.object({ vehicleType: vehicle.optional() });
export const calendarSchema = z.object({ month, vehicleType: vehicle, zone: zoneParam.optional() });
export const slotsSchema = z.object({ date: ymd, vehicleType: vehicle, zone: zoneParam.optional() });

const ID_FORMATS = {
  aadhaar: /^\d{12}$/,
  passport: /^[A-Z0-9]{6,9}$/,
  driving_licence: /^[A-Z0-9]{8,20}$/,
  oci: /^[A-Z0-9]{6,20}$/,
};
const ID_TYPES_BY_NATIONALITY = { indian: ["aadhaar", "driving_licence"], foreigner: ["passport", "oci"] };
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

const travellerSchema = z
  .object({
    type: z.enum(["adult", "child"]),
    name: z.string().trim().min(2).max(80).regex(NAME_RE, "Use letters only"),
    gender: z.string().trim().toLowerCase().pipe(z.enum(["male", "female", "other"])),
    age: z.coerce.number().int().min(5).max(100),
    nationality: z.enum(["indian", "foreigner"]),
    idType: z.enum(["aadhaar", "passport", "driving_licence", "oci"]),
    // "1234 5678 9012" and "ab-123" become "123456789012" / "AB123"
    idNumber: z.string().max(40).transform((v) => v.replace(/[\s-]/g, "").toUpperCase()),
  })
  .superRefine((t, ctx) => {
    if (t.type === "adult" && t.age < 13) ctx.addIssue({ code: "custom", message: "Adult age must be 13-100", path: ["age"] });
    if (t.type === "child" && t.age > 12) ctx.addIssue({ code: "custom", message: "Child age must be 5-12", path: ["age"] });
    if (!ID_TYPES_BY_NATIONALITY[t.nationality].includes(t.idType)) {
      ctx.addIssue({ code: "custom", message: `Invalid ID type for ${t.nationality}`, path: ["idType"] });
    }
    if (!ID_FORMATS[t.idType].test(t.idNumber)) {
      ctx.addIssue({ code: "custom", message: `Invalid format for ${t.idType}`, path: ["idNumber"] });
    }
  });

export const bookingSchema = z.object({
  vehicleType: vehicle,
  zone: zoneParam,
  date: ymd,
  shift: z.enum(["morning", "evening"]),
  contact: z.object({
    name: z.string().trim().min(2).max(80).refine((v) => !/[<>]/.test(v), "Invalid characters"),
    mobile: z.string().trim().regex(/^\d{10}$/, "Mobile must be 10 digits"),
    email: z.string().trim().toLowerCase().email().max(254),
  }),
  travellers: z.array(travellerSchema).min(1).max(16),
});

export const verifySchema = z.object({
  bookingCode: z.string().trim().min(1).max(30),
  razorpay_order_id: z.string().trim().min(1).max(100),
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().min(1).max(200),
});