import crypto from "crypto";
import jwt from "jsonwebtoken";
import userModel from "./user.js";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-jwt-secret-change-me";
}

function registerUser({ email, password, display_name, role }) {
  const userToAdd = new userModel({
    email: normalizeEmail(email),
    password_hash: hashPassword(password),
    display_name: String(display_name).trim(),
    role,
  });
  return userToAdd.save();
}

async function authenticateUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) {
    return null;
  }
  const incomingHash = hashPassword(password);
  if (incomingHash !== user.password_hash) {
    return null;
  }
  return user;
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      display_name: user.display_name,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "2h" }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export default {
  registerUser,
  authenticateUser,
  createAccessToken,
  verifyAccessToken,
  hashPassword,
};
