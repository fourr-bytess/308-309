import { expect, jest } from '@jest/globals';
import reviewModel from "./review.js";
import reviewServices from "./review-services.js";

describe("Review Model and Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        reviewModel.find = jest.fn();
        reviewModel.countDocuments = jest.fn();
        reviewModel.findById = jest.fn();
        reviewModel.findByIdAndDelete = jest.fn();
        jest.spyOn(reviewModel.prototype, 'save').mockReturnThis();
    });

    describe("getReviews and buildReviewsQuery", () => {
        test("Testing filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            reviewModel.find.mockReturnValue({ select: mockSelect });

            await reviewServices.getReviews(
                "5",
                "reviewer1",
                "reviewee1",
                "Great!",
                "Amazing performances"
            );

            expect(reviewModel.find).toHaveBeenCalledWith(expect.objectContaining({
                rating: 5,
                reviewer: "reviewer1",
                reviewee: "reviewee1",
                header: "Great!",
                body: "Amazing performances"
            }));
        });

        test("Testing filters -- success", async () => {
            reviewModel.countDocuments.mockResolvedValue(10);
            const filters = {
                rating: "4",
                revieweeType: "Band"
            };
            await reviewServices.getReviewsCount(filters);
            expect(reviewModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
                rating: 4,
                revieweeType: "Band"
            }));
        });

        test("Testing empty filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            reviewModel.find.mockReturnValue({ select: mockSelect });
            await reviewServices.getReviews("", null, null, null, null);
            expect(reviewModel.find).toHaveBeenCalledWith({});
        });
    });

    describe("getReviewsPaginated", () => {
        test("Testing return reviews and count -- success", async () => {
            const mockReviews = [{ header: "Terrible"}];
            const mockTotal = 1;
            const mockSelect = jest.fn().mockResolvedValue(mockReviews);
            const mockLimit = jest.fn().mockReturnValue({ select: mockSelect });
            const mockSkip = jest.fn().mockReturnValue( {limit: mockLimit });
            reviewModel.find.mockReturnValue({ skip: mockSkip });
            reviewModel.countDocuments.mockResolvedValue(mockTotal);

            const result = await reviewServices.getReviewsPaginated(10, 0, {});
            expect(result).toEqual({ reviews: mockReviews, total: mockTotal });
            expect(reviewModel.countDocuments).toHaveBeenCalled();
        });
    });

    describe("CRUD operations", () => {
        test("Testing addReview -- success", async () => {
            const reviewData = { rating: 2, header: "Not very good" };
            reviewModel.prototype.save = jest.fn().mockResolvedValue(reviewData);
            const result = await reviewServices.addReview(reviewData);
            expect(result).toEqual(reviewData);
            expect(reviewModel.prototype.save).toHaveBeenCalled();
        });

        test("Testing findReviewById -- success", async () => {
            reviewModel.findById.mockResolvedValue({ rating: 2 });
            await reviewServices.findReviewById("111");
            expect(reviewModel.findById).toHaveBeenCalledWith("111");
        });

        test("Testing findReviewByIdAndDelete -- success", async () => {
            reviewModel.findByIdAndDelete.mockResolvedValue({ success: true });
            await reviewServices.findReviewByIdAndDelete("111");
            expect(reviewModel.findByIdAndDelete).toHaveBeenCalledWith("111");
        });
    });
});