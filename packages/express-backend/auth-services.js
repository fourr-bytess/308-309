import crypto from "crypto";
import userModel from "./user.js";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
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

export default {
  registerUser,
  hashPassword,
};
