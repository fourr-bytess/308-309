import mongoose from "mongoose";
import Musician from "./musician.js";

describe("Musician Model Test Suite", () => {

  test("Testing valid musician creation -- pass", async () => {

    const validMusician = new Musician({
      name: "John Doe",
      band_affiliations: [new mongoose.Types.ObjectId()],
      instruments: ["Guitar"],
    });

    await expect(validMusician.validate()).resolves.not.toThrow();
  });

  test("Testing missing name -- fail", async () => {

    const invalidMusician = new Musician({
      band_affiliations: [new mongoose.Types.ObjectId()],
    });

    try {
      await invalidMusician.validate();
    } catch (error) {
      expect(error.message).toContain("name");
    }
  });

  test("Testing missing band affiliations -- fail", async () => {

    const invalidMusician = new Musician({
      name: "John Doe",
    });

    try {
      await invalidMusician.validate();
    } catch (error) {
      expect(error.message).toContain("band_affiliations");
    }
  });

  test("Testing lowercase name conversion -- pass", async () => {

    const validMusician = new Musician({
      name: "Cristian Stewart",
      band_affiliations: [new mongoose.Types.ObjectId()],
    });

    await validMusician.validate();

    expect(validMusician.name).toBe("cristian stewart");
  });

  test("Testing bio max length -- fail", async () => {

    const invalidMusician = new Musician({
      name: "Kimberly Doe",
      band_affiliations: [new mongoose.Types.ObjectId()],
      bio: "a".repeat(1001),
    });

    try {
      await invalidMusician.validate();
    } catch (error) {
      expect(error.message).toContain("bio");
    }
  });

  test("Testing default profile_picture_url -- pass", async () => {

    const validMusician = new Musician({
      name: "Simmon Martinez",
      band_affiliations: [new mongoose.Types.ObjectId()],
    });

    await validMusician.validate();

    expect(validMusician.profile_picture_url).toBe("");
  });

});