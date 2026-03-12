import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  bandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Band",
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
    enum: ["available", "pending", "unavailable", "canceled"],
    default: "unavailable",
    index: true,
  },

  notes: {
    type: String,
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
