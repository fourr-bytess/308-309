import mongoose from "mongoose";

const gigRequestSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    bandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Band",
      required: true,
      index: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "venue",
      required: true,
      index: true,
    },
    bandUserId: {
      type: String,
      required: true,
      index: true,
    },
    venueUserId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "canceled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

gigRequestSchema.index({ gigId: 1, bandId: 1, status: 1 });

const GigRequest = mongoose.model("GigRequest", gigRequestSchema);

export default GigRequest;
