import mongoose from "mongoose";
import bandModel from "./band.js";
import venueModel from "./venue.js";

const GigSchema = new mongoose.Schema(
  {
    owner_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 1000,
    },
    genres: [String],

    location: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    price_range: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value.every((price) => Number.isFinite(price) && price > 0) &&
            value[1] >= value[0]
          );
        },
        message: "price_range must be [min, max] and max must be >= min",
      },
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] &&
            value[1] &&
            value[1] > value[0]
          );
        },
        message: "time must be [startTime, endTime]",
      },
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    booked: {
      type: Boolean,
      required: true,
    },
    bands_hired: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Band",
    },
  },
  { collection: "gigs_list" },
);

const Gig = mongoose.model("Gig", GigSchema);

export default Gig;
