import mongoose from "mongoose";
import bandModel from "./band.js";

const MusicianSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 1,
        },
        band_affiliations: {
            type: [bandModel.Types.ObjectID],
            ref: 'Band',
            required: true
        },
        instruments: [String],
        bio: {
            type: String,
            trim: true,
            maxLength: 1000
        }
    },
    { collection: "musicians_list" }
);

const Musician = mongoose.model("Musician", MusicianSchema);

export default Musician