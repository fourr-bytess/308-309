import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zip: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
    },
    contact_email: {
      type: String,
      required: true,
      trim:true
    },
    description: {
      type: String,
      trim:true
    },
  },
  { collection: "venues" },
);

const Venue = mongoose.model("venue", venueSchema);

export default Venue;
