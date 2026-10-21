import rateLimit from "express-rate-limit";

export const createLimiter = ({ limit, windowMinutes = 15, ...options }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
    ...options,
  });