import mongoose from "mongoose";

const VALID_ROLES = ["musician", "band", "venue"];

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 254,
    },
    password_hash: {
      type: String,
      required: true,
    },
    display_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    role: {
      type: String,
      enum: VALID_ROLES,
      required: true,
    },
  },
  {
    collection: "users",
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

export { VALID_ROLES };
export default User;
