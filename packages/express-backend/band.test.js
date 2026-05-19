import mongoose from "mongoose";
import Band from "./band.js";

describe("Band Model Test Suite", () => {

  test("Testing successful local band profile creation -- pass", async () => {

    const validBand = new Band({
      name: "Midnight Echo",
      members: [new mongoose.Types.ObjectId()],
      genres: ["Indie Rock"],
      locations: ["San Luis Obispo"],
      price_range: [300, 1200],
    });

    await expect(validBand.validate()).resolves.not.toThrow();
  });

  test("Testing band creation without band name -- fail", async () => {

    const invalidBand = new Band({
      members: [new mongoose.Types.ObjectId()],
    });

    try {
      await invalidBand.validate();
    } catch (error) {
      expect(error.message).toContain("name");
    }
  });

  test("Testing band creation without members -- fail", async () => {

    const invalidBand = new Band({
      name: "Sunset Vibes",
    });

    try {
      await invalidBand.validate();
    } catch (error) {
      expect(error.message).toContain("members");
    }
  });

  test("Testing automatic lowercase band name formatting -- pass", async () => {

    const validBand = new Band({
      name: "LATE NIGHT RHYTHM",
      members: [new mongoose.Types.ObjectId()],
    });

    await validBand.validate();

    expect(validBand.name).toBe("late night rhythm");
  });

  test("Testing default empty gallery image array -- pass", async () => {

    const validBand = new Band({
      name: "Golden Hour",
      members: [new mongoose.Types.ObjectId()],
    });

    await validBand.validate();

    expect(validBand.gallery_images).toEqual([]);
  });

  test("Testing default profile picture URL value -- pass", async () => {

    const validBand = new Band({
      name: "Pacific Avenue",
      members: [new mongoose.Types.ObjectId()],
    });

    await validBand.validate();

    expect(validBand.profile_picture_url).toBe("");
  });

});