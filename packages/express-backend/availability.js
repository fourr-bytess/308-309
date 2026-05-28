import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  ownerType: {
    type: String,
    enum: ["venue", "musician", "band"],
    required: true,
    index: true,
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  start: {
    type: Date,
    required: true,
    index: true,
  },

  end: {
    type: Date,
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ["available", "pending", "unavailable", "booked", "canceled"],
    default: "available",
    index: true,
  },

  notes: {
    type: String,
    default: "",
  },
});

availabilitySchema.pre("validate", function () {
  if (this.start && this.end) {
    if (this.end <= this.start) {
      throw new Error("End time must be after start time.");
    }
  }
});

const Availability = mongoose.model("Availability", availabilitySchema);
export default Availability;
