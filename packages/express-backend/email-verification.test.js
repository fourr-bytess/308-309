import mongoose from "mongoose";
import EmailVerification from "./email-verification.js";

describe("EmailVerification Model Test Suite", () => {
  test("valid email verification validates and applies defaults", async () => {
    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: "  TEST@Example.COM  ",
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.email).toBe("test@example.com");
    expect(doc.attempts).toBe(0);
    expect(doc.max_attempts).toBe(5);
    expect(doc.consumed_at).toBeNull();
  });

  test("custom attempts, max_attempts, and consumed_at validate", async () => {
    const consumedAt = new Date("2026-06-01T09:00:00Z");

    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: "person@example.com",
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
      attempts: 2,
      max_attempts: 7,
      consumed_at: consumedAt,
    });

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.attempts).toBe(2);
    expect(doc.max_attempts).toBe(7);
    expect(doc.consumed_at).toEqual(consumedAt);
  });

  test("missing user_id fails validation", async () => {
    const doc = new EmailVerification({
      email: "person@example.com",
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).rejects.toThrow("user_id");
  });

  test("missing email fails validation", async () => {
    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).rejects.toThrow("email");
  });

  test("email shorter than minlength fails validation", async () => {
    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: "a@b",
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).rejects.toThrow("shorter than the minimum");
  });

  test("email longer than maxlength fails validation", async () => {
    const longEmail = `${"a".repeat(250)}@test.com`;

    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: longEmail,
      code_hash: "hashed-code-value",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).rejects.toThrow("longer than the maximum");
  });

  test("missing code_hash fails validation", async () => {
    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: "person@example.com",
      expires_at: new Date("2026-06-01T10:00:00Z"),
    });

    await expect(doc.validate()).rejects.toThrow("code_hash");
  });

  test("missing expires_at fails validation", async () => {
    const doc = new EmailVerification({
      user_id: new mongoose.Types.ObjectId(),
      email: "person@example.com",
      code_hash: "hashed-code-value",
    });

    await expect(doc.validate()).rejects.toThrow("expires_at");
  });
});
