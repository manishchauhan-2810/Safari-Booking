import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import mongoose from "mongoose";
import ApiError from "./utils/ApiError.js";
import { createLimiter } from "./middleware/rateLimit.js";
import publicRoutes from "./routes/publicRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { handleWebhook } from "./controllers/paymentController.js";

const isProd = process.env.NODE_ENV === "production";
const app = express();

// Number of reverse proxies in front of the app (Render/Railway = 1, local = 0)
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    maxAge: 600,
  })
);

// Bookings and admin data contain personal details: never let browsers or proxies cache API responses
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/v1/health", (_req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ success: ok, message: ok ? "OK" : "Database not connected" });
});

// Webhook needs the RAW body, so it must come before express.json()
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), handleWebhook);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Never log the query string (it can contain customer emails)
morgan.token("safe-url", (req) => req.originalUrl.split("?")[0]);
app.use(morgan(isProd ? ":remote-addr :method :safe-url :status :response-time ms" : ":method :safe-url :status :response-time ms"));

const customerLimiter = createLimiter({ limit: 600 });
app.use("/api/v1/public", customerLimiter, publicRoutes);
app.use("/api/v1/bookings", customerLimiter, bookingRoutes);
app.use("/api/v1/payments", customerLimiter, paymentRoutes);
app.use("/api/v1/admin", createLimiter({ limit: 1500 }), adminRoutes);

app.use((_req, _res, next) => next(new ApiError(404, "Not Found")));

app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let operational = Boolean(err.isOperational) || (status >= 400 && status < 500);

  if (err.type === "entity.parse.failed") {
    status = 400; message = "Invalid JSON body"; operational = true;
  } else if (err.type === "entity.too.large") {
    status = 413; message = "Request too large"; operational = true;
  } else if (err.name === "CastError") {
    status = 400; message = "Invalid identifier"; operational = true;
  } else if (err.name === "ValidationError") {
    status = 400; message = "Invalid data"; operational = true;
  } else if (err.code === 11000) {
    status = 409; message = "Duplicate record"; operational = true;
  }

  if (status >= 500) {
    console.error(err);
    if (isProd && !operational) message = "Internal Server Error";
  }

  res.status(status).json({ success: false, message, ...(err.details ? { details: err.details } : {}) });
});

export default app;