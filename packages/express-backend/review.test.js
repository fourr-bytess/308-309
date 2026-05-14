import mongoose from "mongoose";
import Review from "./review.js";

describe("Review Model Test Suite", () => {

  test("Testing valid review creation -- success", async () => {

    const validReview = new Review({
      rating: 5,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Band",
      header: "Amazing",
      body: "Great performance",
    });

    await expect(validReview.validate()).resolves.not.toThrow();
  });

  test("Testing rating above maximum -- failure", async () => {

    const invalidReview = new Review({
      rating: 6,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Band",
    });

    try {
      await invalidReview.validate();
    } catch (error) {
      expect(error.message).toContain("rating");
    }
  });

  test("Testing rating below minimum -- failure", async () => {

    const invalidReview = new Review({
      rating: -1,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Band",
    });

    try {
      await invalidReview.validate();
    } catch (error) {
      expect(error.message).toContain("rating");
    }
  });

  test("Testing invalid revieweeType -- failure", async () => {

    const invalidReview = new Review({
      rating: 5,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Admin",
    });

    try {
      await invalidReview.validate();
    } catch (error) {
      expect(error.message).toContain("revieweeType");
    }
  });

  test("Testing header max length -- failure", async () => {

    const invalidReview = new Review({
      rating: 5,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Band",
      header: "a".repeat(201),
    });

    try {
      await invalidReview.validate();
    } catch (error) {
      expect(error.message).toContain("header");
    }
  });

  test("Testing body max length -- failure", async () => {

    const invalidReview = new Review({
      rating: 5,
      reviewer: new mongoose.Types.ObjectId(),
      reviewee: new mongoose.Types.ObjectId(),
      revieweeType: "Band",
      body: "a".repeat(1001),
    });

    try {
      await invalidReview.validate();
    } catch (error) {
      expect(error.message).toContain("body");
    }
  });

});