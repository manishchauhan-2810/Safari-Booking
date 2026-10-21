import express from "express";
import { createBooking, getBooking } from "../controllers/bookingController.js";
import validate from "../utils/validate.js";
import { bookingSchema } from "./validators.js";
import { createLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/", createLimiter({ limit: 10 }), validate(bookingSchema), createBooking);
router.get("/:bookingCode", createLimiter({ limit: 30 }), getBooking);

export default router;