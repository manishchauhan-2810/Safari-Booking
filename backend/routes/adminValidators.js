import { z } from "zod";
import { isRealDate } from "../utils/date.js";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").refine(isRealDate, "Invalid date");
const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Invalid month");
const slug = z.string().trim().min(1).max(50);
const vehicle = z.enum(["jeep", "canter"]);
const shift = z.enum(["morning", "evening"]);
const jeeps = z.number().int().min(0).max(100);
const canters = z.number().int().min(0).max(20);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id") });
export const summarySchema = z.object({ month, vehicleType: vehicle, zone: slug.optional() });
export const listSchema = z.object({ from: ymd, to: ymd, vehicleType: vehicle.optional(), zone: slug.optional() });

export const patchSlotSchema = z
  .object({ isOpen: z.boolean().optional(), jeeps: jeeps.optional(), canters: canters.optional(), force: z.boolean().optional() })
  .refine((v) => v.isOpen !== undefined || v.jeeps !== undefined || v.canters !== undefined, "Nothing to change");

export const bulkSchema = z
  .object({
    fromDate: ymd,
    toDate: ymd,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([0, 1, 2, 3, 4, 5, 6]),
    zones: z.union([z.literal("all"), z.array(slug).min(1).max(20)]).default("all"),
    shifts: z.array(shift).min(1).max(2).default(["morning", "evening"]),
    vehicleTypes: z.array(vehicle).min(1).max(2),
    isOpen: z.boolean().optional(),
    jeeps: jeeps.optional(),
    canters: canters.optional(),
    force: z.boolean().optional(),
  })
  .refine((v) => v.isOpen !== undefined || v.jeeps !== undefined || v.canters !== undefined, "Choose at least one of isOpen, jeeps, canters")
  .refine((v) => v.jeeps === undefined || v.vehicleTypes.includes("jeep"), { message: "jeeps was given but jeep is not selected", path: ["jeeps"] })
  .refine((v) => v.canters === undefined || v.vehicleTypes.includes("canter"), { message: "canters was given but canter is not selected", path: ["canters"] });

const paise = z.number().int().min(100).max(10_000_000);
const timing = z.string().trim().min(3).max(40);

export const settingsSchema = z.object({
  feePercent: z.number().min(0).max(20).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, "At most 2 decimals"),
  jeepIndianPaise: paise,
  jeepForeignPaise: paise,
  canterIndianPaise: paise,
  canterForeignPaise: paise,
  holdMinutes: z.number().int().min(5).max(60),
  shiftTimings: z.object({ morning: timing, evening: timing }),
});

export const listBookingsSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.enum(["all", "pending", "confirmed", "expired", "failed", "cancelled", "refunded", "paid_needs_refund"]).optional(),
  vehicleType: vehicle.optional(),
  from: ymd.optional(),
  to: ymd.optional(),
  sort: z.enum(["newest", "safari_asc", "safari_desc"]).default("newest"),
});