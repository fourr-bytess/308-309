import mongoose from "mongoose";
import bandModel from "./band.js";
import venueModel from "./venue.js";

const ReviewSchema = new mongoose.Schema(
    {
        rating: {
            type: Number,
            min: 0,
            max: 5,
            required: true
        },
        reviewer: {
            type: [bandModel.Types.ObjectID, venueModel.Types.ObjectID],
            ref: ['Band', 'Venue'],
            required: true
        },
        reviewee: {
            type: [bandModel.Types.ObjectID, venueModel.Types.ObjectID],
            ref: ['Band', 'Venue'],
            required: true
        },
        header: {
            type: String,
            trim: true,
            maxLength: 200
        },
        body: {
            type: String,
            trim: true,
            maxLength: 1000
        },
    },
    { collection: "reviews_list" }
);

const Review = mongoose.model("Review", ReviewSchema);

export default Review