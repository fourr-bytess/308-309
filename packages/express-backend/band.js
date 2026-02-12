import mongoose from "mongoose";

const BandSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        member_names: {
            type: [String],
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