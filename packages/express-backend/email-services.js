import nodemailer from "nodemailer";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getTransportConfigFromEnv() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!isNonEmptyString(host) || !isNonEmptyString(portRaw)) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";

  return {
    host: host.trim(),
    port,
    secure,
    auth:
      isNonEmptyString(user) && isNonEmptyString(pass)
        ? { user: user.trim(), pass }
        : undefined,
  };
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "no-reply@giggly.local";
}

async function sendVerificationCodeEmail({ to, code, minutesValid }) {
  const transportConfig = getTransportConfigFromEnv();

  // Dev-friendly fallback: if SMTP isn't configured, log the code.
  if (!transportConfig) {
    console.log(
      `[email-verification] SMTP not configured. Code for ${to}: ${code} (valid ${minutesValid} min)`
    );
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(transportConfig);
  const subject = "Your Giggly verification code";
  const text = `Your Giggly verification code is: ${code}\n\nIt expires in ${minutesValid} minutes.`;

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
  });

  return { delivered: true };
}

function isSmtpConfigured() {
  return getTransportConfigFromEnv() !== null;
}

export default {
  sendVerificationCodeEmail,
  isSmtpConfigured,
};

