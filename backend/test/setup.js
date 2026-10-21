import dotenv from "dotenv";

// Runs before every test file, so app.js never picks up your real .env values
dotenv.config({ path: ".env.test" });
process.env.JWT_SECRET ||= "test-jwt-secret-".padEnd(48, "x");
process.env.CLIENT_ORIGINS = "http://localhost:5174";
process.env.RAZORPAY_KEY_ID ||= "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET ||= "dummy_secret";