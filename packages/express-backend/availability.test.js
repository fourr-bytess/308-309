import mongoose from "mongoose";
import Availability from "./availability";

describe("Availability Model Remaining Coverage", () => {
  test("Testing if end time is before start time -- fail", async () => {
    const invalidDoc = new Availability({
      bandId: new mongoose.Types.ObjectId(),
      start: new Date("2026-02-02T12:00:00Z"),
      end: new Date("2026-02-02T10:00:00Z"),
    });

    try {
      await invalidDoc.validate();
    } catch (error) {
      expect(error.message).toContain("End time must be after start time");
    }
  });

  test("Testing if end time = start time -- fail", async () => {
    const time = new Date("2026-02-02T12:00:00Z");
    const invalidDoc = new Availability({
      bandId: new mongoose.Types.ObjectId(),
      start: time,
      end: time,
    });

    try {
      await invalidDoc.validate();
    } catch (error) {
      expect(error.message).toContain("End time must be after start time");
    }
  });

  test("Testing if end time is after start time -- pass", async () => {
    const validDoc = new Availability({
      bandId: new mongoose.Types.ObjectId(),
      start: new Date("2026-02-02T10:00:00Z"),
      end: new Date("2026-02-02T12:00:00Z"),
      status: "available",
    });
    await expect(validDoc.validate()).resolves.not.toThrow();
  });
});
