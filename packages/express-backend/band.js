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
        profile_picture_url: {
            type: String,
            trim: true,
            default: ""
        },
        gallery_images: {
            type: [String],
            default: []
        },
        video_urls: [{ type: String }]
    },
    { collection: "bands_list" }
);

const Band = mongoose.model("Band", BandSchema);

export default Band