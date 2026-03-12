import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
    {
        rating: {
            type: Number,
            min: 0,
            max: 5,
            required: true
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        reviewee: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        revieweeType: {
            type: String,
            enum: ['Band', 'Venue', 'Musician'],
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

export default Review;