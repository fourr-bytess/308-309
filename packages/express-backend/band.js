import mongoose from "mongoose";
import musicianModel from "./musician.js";

const BandSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 1,
        },
        members: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Musician',
            required: true
        },
        genres: [String],
        locations: [String],
        price_range: [Number],
    },
    { collection: "bands_list" }
);

const Band = mongoose.model("Band", BandSchema);

export default Band