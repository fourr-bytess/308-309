import { jest } from "@jest/globals";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const { default: emailServices } = await import("./email-services.js");

const ORIGINAL_ENV = { ...process.env };

function resetEmailEnv() {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_SECURE;
  delete process.env.EMAIL_FROM;
}

describe("Email Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env = { ...ORIGINAL_ENV };
    resetEmailEnv();

    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  test("sendVerificationCodeEmail logs code when SMTP is not configured", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const result = await emailServices.sendVerificationCodeEmail({
      to: "test@example.com",
      code: "123456",
      minutesValid: 10,
    });

    expect(result).toEqual({ delivered: false });
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Code for test@example.com: 123456")
    );
  });

  test("sendVerificationCodeEmail logs code when SMTP host is missing", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    process.env.SMTP_PORT = "587";

    const result = await emailServices.sendVerificationCodeEmail({
      to: "missinghost@example.com",
      code: "111111",
      minutesValid: 5,
    });

    expect(result).toEqual({ delivered: false });
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("sendVerificationCodeEmail logs code when SMTP port is missing", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    process.env.SMTP_HOST = "smtp.example.com";

    const result = await emailServices.sendVerificationCodeEmail({
      to: "missingport@example.com",
      code: "222222",
      minutesValid: 5,
    });

    expect(result).toEqual({ delivered: false });
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("sendVerificationCodeEmail logs code when SMTP port is invalid", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "not-a-number";

    const result = await emailServices.sendVerificationCodeEmail({
      to: "badport@example.com",
      code: "333333",
      minutesValid: 5,
    });

    expect(result).toEqual({ delivered: false });
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("sendVerificationCodeEmail logs code when SMTP port is zero", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "0";

    const result = await emailServices.sendVerificationCodeEmail({
      to: "zeroport@example.com",
      code: "444444",
      minutesValid: 5,
    });

    expect(result).toEqual({ delivered: false });
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  test("sendVerificationCodeEmail sends email with SMTP config and default from address", async () => {
    process.env.SMTP_HOST = " smtp.example.com ";
    process.env.SMTP_PORT = "587";

    mockSendMail.mockResolvedValue({ accepted: ["test@example.com"] });

    const result = await emailServices.sendVerificationCodeEmail({
      to: "test@example.com",
      code: "123456",
      minutesValid: 10,
    });

    expect(result).toEqual({ delivered: true });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: undefined,
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "no-reply@giggly.local",
      to: "test@example.com",
      subject: "Your Giggly verification code",
      text: expect.stringContaining("123456"),
    });
  });

  test("sendVerificationCodeEmail sends email with auth and custom from address", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = " user@example.com ";
    process.env.SMTP_PASS = "secretpass";
    process.env.SMTP_SECURE = "true";
    process.env.EMAIL_FROM = "support@giggly.com";

    mockSendMail.mockResolvedValue({ accepted: ["auth@example.com"] });

    const result = await emailServices.sendVerificationCodeEmail({
      to: "auth@example.com",
      code: "654321",
      minutesValid: 15,
    });

    expect(result).toEqual({ delivered: true });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "secretpass",
      },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "support@giggly.com",
      to: "auth@example.com",
      subject: "Your Giggly verification code",
      text: expect.stringContaining("654321"),
    });
  });

  test("sendVerificationCodeEmail treats SMTP_SECURE 1 as secure", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "1";

    mockSendMail.mockResolvedValue({ accepted: ["secure@example.com"] });

    const result = await emailServices.sendVerificationCodeEmail({
      to: "secure@example.com",
      code: "999999",
      minutesValid: 20,
    });

    expect(result).toEqual({ delivered: true });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
      })
    );
  });

  test("sendVerificationCodeEmail rejects when transporter fails", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";

    mockSendMail.mockRejectedValue(new Error("SMTP failure"));

    await expect(
      emailServices.sendVerificationCodeEmail({
        to: "fail@example.com",
        code: "101010",
        minutesValid: 10,
      })
    ).rejects.toThrow("SMTP failure");
  });
});
