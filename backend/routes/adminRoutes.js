import express from "express";
import validate from "../utils/validate.js";
import { authAdmin, csrfGuard } from "../middleware/authAdmin.js";
import { createLimiter } from "../middleware/rateLimit.js";
import * as admin from "../controllers/adminController.js";
import * as availability from "../controllers/adminAvailabilityController.js";
import * as settings from "../controllers/adminSettingsController.js";
import * as bookings from "../controllers/adminBookingsController.js";
import {
  loginSchema, idParamSchema, summarySchema, listSchema, patchSlotSchema, bulkSchema, settingsSchema, listBookingsSchema,
} from "./adminValidators.js";

const router = express.Router();

router.use(csrfGuard);

// Only failed attempts count toward the limit
router.post("/login", createLimiter({ limit: 10, skipSuccessfulRequests: true }), validate(loginSchema), admin.login);
router.post("/logout", admin.logout);

router.use(authAdmin);
router.get("/me", admin.getMe);

router.get("/availability/summary", validate(summarySchema), availability.summary);
router.get("/availability", validate(listSchema), availability.list);
router.put("/availability/bulk", validate(bulkSchema), availability.bulkUpdate);
router.patch("/availability/:id", validate(idParamSchema, "params"), validate(patchSlotSchema), availability.patchSlot);

router.get("/settings", settings.getSettings);
router.put("/settings", validate(settingsSchema), settings.updateSettings);

router.get("/bookings", validate(listBookingsSchema), bookings.list);
router.get("/bookings/:id", validate(idParamSchema, "params"), bookings.detail);
router.post("/bookings/:id/resend-email", createLimiter({ limit: 20 }), validate(idParamSchema, "params"), bookings.resendEmail);

export default router;