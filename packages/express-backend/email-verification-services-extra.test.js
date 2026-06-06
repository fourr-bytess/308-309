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

describe("Email Verification Services Extra Branch Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EMAIL_VERIFICATION_SECRET;
  });

  test("sendVerificationForEmail returns ok for blank email without querying user", async () => {
    const result = await emailVerificationServices.sendVerificationForEmail({
      email: "   ",
    });

    expect(result).toEqual({ ok: true });
    expect(mockUserModel.findOne).not.toHaveBeenCalled();
    expect(mockEmailVerification.create).not.toHaveBeenCalled();
    expect(mockEmailServices.sendVerificationCodeEmail).not.toHaveBeenCalled();
  });

  test("verifyCodeForEmail works when expires_at is null and code has extra spaces", async () => {
    mockLatestVerification({
      _id: "verification-null-expiration",
      user_id: "user123",
      email: "person@example.com",
      code_hash: hashCode("123456"),
      expires_at: null,
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
      email: "PERSON@Example.COM",
      code: " 123456 ",
    });

    expect(result).toEqual({ ok: true });

    expect(mockEmailVerification.findOne).toHaveBeenCalledWith({
      email: "person@example.com",
      consumed_at: null,
    });

    expect(mockEmailVerification.updateOne).toHaveBeenCalledWith(
      { _id: "verification-null-expiration" },
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
});
