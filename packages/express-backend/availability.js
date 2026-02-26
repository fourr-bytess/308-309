import mongoose from "mongoose";

const availabilitySchema = new Schema({
  bandId: {
    type: Schema.Types.ObjectId,
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

availabilitySchema.pre("validate", function (next) {
  if (this.start && this.end) {
    if (this.end <= this.start) {
      return next(new Error("End time must be after start time."));
    }
  }
  next();
});

const Availibility = mongoose.model("Availibility", availabilitySchema);
export default Availibility;
