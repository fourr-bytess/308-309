import mongoose from "mongoose";
import reviewModel from "./review.js";

const REVIEW_SELECT = 'rating reviewer reviewee revieweeType header body';

function buildReviewsQuery(filters = {}) {
    const query = {};
    if (filters.rating !== undefined && filters.rating !== '') {
        query.rating = Number(filters.rating);
    }
    if (filters.reviewer) {
        query.reviewer = filters.reviewer;
    }
    if (filters.reviewee) {
        query.reviewee = filters.reviewee;
    }
    if (filters.revieweeType) {
        query.revieweeType = filters.revieweeType;
    }
    if (filters.header) {
        query.header = filters.header;
    }
    if (filters.body) {
        query.body = filters.body;
    }
    return query;
}

function getReviews(rating, reviewer, reviewee, header, body) {
    const query = buildReviewsQuery({ rating, reviewer, reviewee, header, body });
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