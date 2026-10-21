import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import { encryptField, decryptField } from "../utils/crypto.js";

afterEach(() => { delete process.env.DATA_ENCRYPTION_KEY; });

describe("field encryption", () => {
  it("round-trips, never stores plain text, and is idempotent", () => {
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    const enc = encryptField("123456789012");
    expect(enc).not.toContain("123456789012");
    expect(decryptField(enc)).toBe("123456789012");
    expect(encryptField(enc)).toBe(enc);
    expect(decryptField("plain-legacy-value")).toBe("plain-legacy-value");
  });

  it("detects tampering and a wrong key", () => {
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    const enc = encryptField("K1234567");
    expect(() => decryptField(enc.slice(0, -6) + "AAAAAA")).toThrow();
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    expect(() => decryptField(enc)).toThrow();
  });

  it("stores plain text when no key is configured (development only)", () => {
    expect(encryptField("abc")).toBe("abc");
  });
});