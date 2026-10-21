import express from "express";
import { verifyPayment } from "../controllers/paymentController.js";
import validate from "../utils/validate.js";
import { verifySchema } from "./validators.js";
import { createLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/verify", createLimiter({ limit: 30 }), validate(verifySchema), verifyPayment);

export default router;