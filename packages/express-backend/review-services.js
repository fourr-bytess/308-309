import mongoose from "mongoose";
import reviewModel from "./review.js";

const REVIEW_SELECT = 'rating header body';

function buildReviewsQuery(filters = {}) {
    const query = {};
    if (filters.rating) {
        query.rating = filters.rating();
    }
    if (filters.header) {
        query.header = filters.header.toLowerCase();
    }
    if (filters.body) {
        query.body = filters.body.toLowerCase();
    }
    return query;
}

function getReviews(rating, header, body) {
    const query = buildReviewsQuery({ rating, header, body });
    return reviewModel.find(query).select(REVIEW_SELECT);
}

function getReviewsCount(filters = {}) {
    return reviewModel.countDocuments(buildReviewsQuery(filters));
}

function getReviewsPaginated(limit, offset, filters = {}) {
    const query = buildReviewsQuery(filters);
    const reviewsPromise = reviewModel.find(query).skip(offset).limit(limit).select(REVIEW_SELECT);
    const countPromise = reviewModel.countDocuments(query);
    return Promise.all([reviewsPromise, countPromise]).then(([reviews, total]) => ({ reviews, total }));
}


function findReviewById(id) {
    return reviewModel.findById(id);
}

function addReview(review) {
    const reviewToAdd = new reviewModel(review);
    return reviewToAdd.save();
}

function findReviewByIdAndDelete(id) {
    return reviewModel.findByIdAndDelete(id);
}



export default {
    addReview,
    getReviews,
    getReviewsCount,
    getReviewsPaginated,
    findReviewById,
    findReviewByIdAndDelete
};