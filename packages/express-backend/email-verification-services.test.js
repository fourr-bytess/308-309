import { jest } from "@jest/globals";
import crypto from "crypto";

const mockEmailVerification = {
  create: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

const mockUserModel = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

const mockEmailServices = {
  sendVerificationCodeEmail: jest.fn(),
};

jest.unstable_mockModule("./email-verification.js", () => ({
  default: mockEmailVerification,
}));

jest.unstable_mockModule("./user.js", () => ({
  default: mockUserModel,
}));

jest.unstable_mockModule("./email-services.js", () => ({
  default: mockEmailServices,
}));

const { default: emailVerificationServices } = await import(
  "./email-verification-services.js"
);

const ORIGINAL_ENV = { ...process.env };

function hashCode(code, secret = "dev-email-verify-secret") {
  return crypto
    .createHash("sha256")
    .update(`${secret}:${String(code || "").trim()}`)
    .digest("hex");
}

function mockLatestVerification(latest) {
  const mockSort = jest.fn().mockResolvedValue(latest);

  mockEmailVerification.findOne.mockReturnValue({
    sort: mockSort,
  });

  return mockSort;
}

describe("Email Verification Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EMAIL_VERIFICATION_SECRET;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  describe("normalizeEmail", () => {
    test("normalizes email by trimming and lowercasing", () => {
      expect(
        emailVerificationServices.normalizeEmail("  TEST@Email.COM  ")
      ).toBe("test@email.com");
    });

    test("normalizes missing email to empty string", () => {
      expect(emailVerificationServices.normalizeEmail()).toBe("");
      expect(emailVerificationServices.normalizeEmail(null)).toBe("");
    });
  });

  describe("sendVerificationForEmail", () => {
    test("returns ok true when user does not exist", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await emailVerificationServices.sendVerificationForEmail({
        email: "missing@example.com",
      });

      expect(result).toEqual({ ok: true });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "missing@example.com",
      });

      expect(mockEmailVerification.create).not.toHaveBeenCalled();
      expect(mockEmailServices.sendVerificationCodeEmail).not.toHaveBeenCalled();
    });

    test("returns ok true when email is empty", async () => {
      const result = await emailVerificationServices.sendVerificationForEmail({
        email: "   ",
      });

      expect(result).toEqual({ ok: true });
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockEmailVerification.create).not.toHaveBeenCalled();
    });

    test("returns ok true when user email is already verified", async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: "user123",
        email: "verified@example.com",
        email_verified: true,
      });

      const result = await emailVerificationServices.sendVerificationForEmail({
        email: "verified@example.com",
      });

      expect(result).toEqual({ ok: true });
      expect(mockEmailVerification.create).not.toHaveBeenCalled();
      expect(mockEmailServices.sendVerificationCodeEmail).not.toHaveBeenCalled();
    });

    test("creates and sends verification for unverified user", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.1);
      jest
        .spyOn(Date, "now")
        .mockReturnValue(new Date("2026-01-01T00:00:00Z").getTime());

      mockUserModel.findOne.mockResolvedValue({
        _id: "user123",
        email: "User@Example.COM",
        email_verified: false,
      });

      mockEmailVerification.create.mockResolvedValue({
        _id: "verification123",
      });

      mockEmailServices.sendVerificationCodeEmail.mockResolvedValue({
        delivered: true,
      });

      const result = await emailVerificationServices.sendVerificationForEmail({
        email: " USER@example.com ",
      });

      expect(result).toEqual({ ok: true });

      expect(mockEmailVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user123",
          email: "user@example.com",
          code_hash: expect.any(String),
          expires_at: new Date("2026-01-01T00:10:00Z"),
          attempts: 0,
          max_attempts: 5,
          consumed_at: null,
        })
      );

      expect(mockEmailServices.sendVerificationCodeEmail).toHaveBeenCalledWith({
        to: "user@example.com",
        code: "111111",
        minutesValid: 10,
      });
    });
  });

  describe("sendVerificationForUser", () => {
    test("creates verification directly for a user and sends email", async () => {
      jest.spyOn(Math, "random").mockReturnValue(0.2);

      mockEmailVerification.create.mockResolvedValue({
        _id: "verification456",
      });

      mockEmailServices.sendVerificationCodeEmail.mockResolvedValue({
        delivered: false,
      });

      const result = await emailVerificationServices.sendVerificationForUser({
        userId: "user456",
        email: " Direct@Example.COM ",
      });

      expect(result).toEqual({ ok: true });

      expect(mockEmailVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user456",
          email: "direct@example.com",
          attempts: 0,
          max_attempts: 5,
          consumed_at: null,
        })
      );

      expect(mockEmailServices.sendVerificationCodeEmail).toHaveBeenCalledWith({
        to: "direct@example.com",
        code: "222222",
        minutesValid: 10,
      });
    });
  });

  describe("verifyCodeForEmail", () => {
    test("returns invalid code when no verification record exists", async () => {
      mockLatestVerification(null);

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "none@example.com",
        code: "123456",
      });

      expect(result).toEqual({
        ok: false,
        error: "Invalid code",
      });

      expect(mockEmailVerification.findOne).toHaveBeenCalledWith({
        email: "none@example.com",
        consumed_at: null,
      });
    });

    test("returns code expired when latest verification is expired", async () => {
      mockLatestVerification({
        _id: "verification123",
        email: "expired@example.com",
        code_hash: hashCode("123456"),
        expires_at: new Date("2000-01-01T00:00:00Z"),
        attempts: 0,
        max_attempts: 5,
      });

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "expired@example.com",
        code: "123456",
      });

      expect(result).toEqual({
        ok: false,
        error: "Code expired",
      });

      expect(mockEmailVerification.updateOne).not.toHaveBeenCalled();
      expect(mockUserModel.updateOne).not.toHaveBeenCalled();
    });

    test("returns too many attempts when max attempts reached", async () => {
      mockLatestVerification({
        _id: "verification123",
        email: "locked@example.com",
        code_hash: hashCode("123456"),
        expires_at: new Date("2099-01-01T00:00:00Z"),
        attempts: 5,
        max_attempts: 5,
      });

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "locked@example.com",
        code: "123456",
      });

      expect(result).toEqual({
        ok: false,
        error: "Too many attempts",
      });

      expect(mockEmailVerification.updateOne).not.toHaveBeenCalled();
      expect(mockUserModel.updateOne).not.toHaveBeenCalled();
    });

    test("increments attempts when submitted code is wrong", async () => {
      mockLatestVerification({
        _id: "verification123",
        email: "wrong@example.com",
        code_hash: hashCode("123456"),
        expires_at: new Date("2099-01-01T00:00:00Z"),
        attempts: 1,
        max_attempts: 5,
      });

      mockEmailVerification.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "wrong@example.com",
        code: "000000",
      });

      expect(result).toEqual({
        ok: false,
        error: "Invalid code",
      });

      expect(mockEmailVerification.updateOne).toHaveBeenCalledWith(
        { _id: "verification123" },
        { $inc: { attempts: 1 } }
      );

      expect(mockUserModel.updateOne).not.toHaveBeenCalled();
    });

    test("verifies email when submitted code matches", async () => {
      mockLatestVerification({
        _id: "verification123",
        user_id: "user123",
        email: "good@example.com",
        code_hash: hashCode("123456"),
        expires_at: new Date("2099-01-01T00:00:00Z"),
        attempts: 0,
        max_attempts: 5,
      });

      mockEmailVerification.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      mockUserModel.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "good@example.com",
        code: "123456",
      });

      expect(result).toEqual({ ok: true });

      expect(mockEmailVerification.updateOne).toHaveBeenCalledWith(
        { _id: "verification123" },
        {
          $set: {
            consumed_at: expect.any(Date),
          },
        }
      );

      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: "user123" },
        {
          $set: {
            email_verified: true,
            email_verified_at: expect.any(Date),
          },
        }
      );
    });

    test("uses custom secret when hashing submitted code", async () => {
      process.env.EMAIL_VERIFICATION_SECRET = "custom-test-secret";

      mockLatestVerification({
        _id: "verification999",
        user_id: "user999",
        email: "secret@example.com",
        code_hash: hashCode("987654", "custom-test-secret"),
        expires_at: new Date("2099-01-01T00:00:00Z"),
        attempts: 0,
        max_attempts: 5,
      });

      mockEmailVerification.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      mockUserModel.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await emailVerificationServices.verifyCodeForEmail({
        email: "secret@example.com",
        code: "987654",
      });

      expect(result).toEqual({ ok: true });
      expect(mockEmailVerification.updateOne).toHaveBeenCalled();
      expect(mockUserModel.updateOne).toHaveBeenCalled();
    });
  });

  describe("devBypassVerifyEmail", () => {
    test("marks email as verified using normalized email", async () => {
      mockUserModel.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await emailVerificationServices.devBypassVerifyEmail({
        email: " DEV@Example.COM ",
      });

      expect(result).toEqual({ ok: true });

      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { email: "dev@example.com" },
        {
          $set: {
            email_verified: true,
            email_verified_at: expect.any(Date),
          },
        }
      );
    });
  });
});
