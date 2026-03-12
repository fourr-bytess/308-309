import mongoose from "mongoose";
import bandModel from "./band.js";
import venueModel from "./venue.js";

const GigSchema = new mongoose.Schema(
    {
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
            maxLength: 1000
        },
        genres: [String],
        location: String,
        price_range: [Number],
        date: Date,
        time: [Date],
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Venue',
            required: true
        },
        booked: {
            type: Boolean,
            required: true
        },
        bands_hired: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Band'
        }

    },
    { collection: "gigs_list" }
);

const Gig = mongoose.model("Gig", GigSchema);

export default Gig