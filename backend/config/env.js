const REQUIRED = ["MONGO_URI", "CLIENT_ORIGINS", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "JWT_SECRET"];
const PLACEHOLDER = /^(supersecretkey|changeme|change_me|secret|password|adminpassword|rzp_test_key|rzp_test_secret|webhook_secret)/i;

export const assertEnv = () => {
  const isProd = process.env.NODE_ENV === "production";
  const env = process.env;
  const errors = [];
  const warnings = [];

  for (const k of REQUIRED) if (!env[k]) errors.push(`${k} is missing`);

  if (env.JWT_SECRET) {
    if (env.JWT_SECRET.length < 32) errors.push("JWT_SECRET must be at least 32 characters");
    if (PLACEHOLDER.test(env.JWT_SECRET)) (isProd ? errors : warnings).push("JWT_SECRET looks like a placeholder");
  }

  const sameSite = (env.COOKIE_SAMESITE || "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) errors.push("COOKIE_SAMESITE must be lax, strict or none");

  if (env.DATA_ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(env.DATA_ENCRYPTION_KEY)) {
    errors.push("DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }

  if (isProd) {
    if (!env.DATA_ENCRYPTION_KEY) errors.push("DATA_ENCRYPTION_KEY is required in production (ID numbers are encrypted with it)");
    if (!env.RAZORPAY_WEBHOOK_SECRET) warnings.push("RAZORPAY_WEBHOOK_SECRET is not set; the webhook backup is disabled");
    if (env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) warnings.push("Production is using TEST Razorpay keys");
    if (env.CLIENT_ORIGINS?.includes("localhost")) warnings.push("CLIENT_ORIGINS still contains localhost");
    if (env.TRUST_PROXY === "0" || !env.TRUST_PROXY) warnings.push("TRUST_PROXY is 0: behind a proxy every user shares one IP for rate limits");
    if (sameSite === "lax" && !env.COOKIE_DOMAIN) warnings.push("COOKIE_SAMESITE=lax: the dashboard login only works if dashboard and API share a registrable domain; otherwise use none");
    if (!env.SMTP_HOST) warnings.push("SMTP is not configured; invoices will not be emailed");
  }

  warnings.forEach((w) => console.warn(`[env] WARNING: ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`[env] ERROR: ${e}`));
    process.exit(1);
  }
};