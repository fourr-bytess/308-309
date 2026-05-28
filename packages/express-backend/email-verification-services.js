import crypto from "crypto";
import EmailVerification from "./email-verification.js";
import userModel from "./user.js";
import emailServices from "./email-services.js";

const DEFAULT_TTL_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getVerificationSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || "dev-email-verify-secret";
}

function hashCode(code) {
  const secret = getVerificationSecret();
  return crypto
    .createHash("sha256")
    .update(`${secret}:${String(code || "").trim()}`)
    .digest("hex");
}

function generateNumericCode(length = 6) {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

async function createVerification({ userId, email, ttlMinutes = DEFAULT_TTL_MINUTES }) {
  const normalizedEmail = normalizeEmail(email);
  const code = generateNumericCode(6);
  const now = Date.now();
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000);

  const record = await EmailVerification.create({
    user_id: userId,
    email: normalizedEmail,
    code_hash: hashCode(code),
    expires_at: expiresAt,
    attempts: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    consumed_at: null,
  });

  return {
    record,
    code,
    expiresAt,
    ttlMinutes,
  };
}

async function sendVerificationForUser({ userId, email }) {
  const { code, ttlMinutes } = await createVerification({ userId, email });
  await emailServices.sendVerificationCodeEmail({
    to: normalizeEmail(email),
    code,
    minutesValid: ttlMinutes,
  });
  return { ok: true };
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return userModel.findOne({ email: normalizedEmail });
}

async function sendVerificationForEmail({ email }) {
  const user = await findUserByEmail(email);
  if (!user) {
    // Don't leak existence.
    return { ok: true };
  }

  if (user.email_verified) {
    return { ok: true };
  }

  await sendVerificationForUser({ userId: user._id, email: user.email });
  return { ok: true };
}

async function verifyCodeForEmail({ email, code }) {
  const normalizedEmail = normalizeEmail(email);
  const submittedHash = hashCode(code);
  const now = new Date();

  const latest = await EmailVerification.findOne({
    email: normalizedEmail,
    consumed_at: null,
  }).sort({ createdAt: -1 });

  if (!latest) {
    return { ok: false, error: "Invalid code" };
  }

  if (latest.expires_at && now > latest.expires_at) {
    return { ok: false, error: "Code expired" };
  }

  if (latest.attempts >= latest.max_attempts) {
    return { ok: false, error: "Too many attempts" };
  }

  const matches = String(latest.code_hash) === String(submittedHash);

  if (!matches) {
    await EmailVerification.updateOne(
      { _id: latest._id },
      { $inc: { attempts: 1 } },
    );
    return { ok: false, error: "Invalid code" };
  }

  await Promise.all([
    EmailVerification.updateOne(
      { _id: latest._id },
      { $set: { consumed_at: now } },
    ),
    userModel.updateOne(
      { _id: latest.user_id },
      { $set: { email_verified: true, email_verified_at: now } },
    ),
  ]);

  return { ok: true };
}

async function devBypassVerifyEmail({ email }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  await userModel.updateOne(
    { email: normalizedEmail },
    { $set: { email_verified: true, email_verified_at: now } },
  );

  return { ok: true };
}

export default {
  sendVerificationForEmail,
  sendVerificationForUser,
  verifyCodeForEmail,
  devBypassVerifyEmail,
  normalizeEmail,
};

