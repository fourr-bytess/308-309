import mongoose from "mongoose";

const EmailVerificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 254,
      index: true,
    },
    code_hash: {
      type: String,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    max_attempts: {
      type: Number,
      default: 5,
    },
    consumed_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "email_verifications",
    timestamps: true,
  },
);

EmailVerificationSchema.index({ user_id: 1, email: 1, createdAt: -1 });

const EmailVerification = mongoose.model(
  "EmailVerification",
  EmailVerificationSchema,
);

export default EmailVerification;

