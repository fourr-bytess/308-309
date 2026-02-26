import mongoose from "mongoose";

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
        hosts: {
            type: [Stirng],
            required: true
        },
        booked: {
            type: Boolean,
            required: true
        },
        bands_hired: [String]

    },
    { collection: "gigs_list" }
);

const Gig = mongoose.model("Gig", GigSchema);

export default Gig