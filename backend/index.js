import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { assertEnv } from "./config/env.js";
import { startExpireHoldsJob } from "./jobs/expireHolds.js";
import { startEmailRetryJob } from "./jobs/emailRetry.js";

assertEnv();

let server;
let stopJob;
let stopMailJob;

const start = async () => {
  await connectDB();
  stopJob = startExpireHoldsJob();
  stopMailJob = startEmailRetryJob();
  const port = process.env.PORT || 3000;
  server = app.listen(port, () => console.log(`Server running on port ${port}`));
  server.on("error", (err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
  });
};

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  stopJob?.();
  stopMailJob?.();
  server?.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
// State after an uncaught exception is unknown: log, then let the process manager restart us
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});

start();