import crypto from "crypto";

const PREFIX = "enc:v1:";

const getKey = () => {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex) return null;
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  return key;
};

export const encryptField = (value) => {
  if (typeof value !== "string" || !value || value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
};

export const decryptField = (value) => {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) throw new Error("DATA_ENCRYPTION_KEY is required to read encrypted data");
  const [iv, tag, data] = value.slice(PREFIX.length).split(":").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};

export const normalizeId = (value) => String(value ?? "").replace(/[\s-]/g, "").toUpperCase();

// Blind index: a keyed hash that lets us find a booking by ID number without storing the number in plain text.
// If you ever change DATA_ENCRYPTION_KEY, run `npm run backfill:idhash` again.
export const idHash = (value) => {
  const normalized = normalizeId(value);
  if (!normalized) return undefined;
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY or JWT_SECRET is required");
  return crypto.createHmac("sha256", secret).update(`id:${normalized}`).digest("hex");
};