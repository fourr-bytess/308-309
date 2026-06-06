import mongoose from "mongoose";
import GigRequest from "./gig-request.js";

function validGigRequest(overrides = {}) {
  return new GigRequest({
    gigId: new mongoose.Types.ObjectId(),
    bandId: new mongoose.Types.ObjectId(),
    venueId: new mongoose.Types.ObjectId(),
    bandUserId: "band-user-123",
    venueUserId: "venue-user-123",
    ...overrides,
  });
}

describe("GigRequest Model Test Suite", () => {
  test("valid gig request validates and defaults to pending", async () => {
    const doc = validGigRequest();

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.status).toBe("pending");
  });

  test("accepted status validates", async () => {
    const doc = validGigRequest({ status: "accepted" });

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.status).toBe("accepted");
  });

  test("declined status validates", async () => {
    const doc = validGigRequest({ status: "declined" });

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.status).toBe("declined");
  });

  test("canceled status validates", async () => {
    const doc = validGigRequest({ status: "canceled" });

    await expect(doc.validate()).resolves.not.toThrow();

    expect(doc.status).toBe("canceled");
  });

  test("invalid status fails validation", async () => {
    const doc = validGigRequest({ status: "not-real-status" });

    await expect(doc.validate()).rejects.toThrow("not-real-status");
  });

  test("missing gigId fails validation", async () => {
    const doc = validGigRequest({ gigId: undefined });

    await expect(doc.validate()).rejects.toThrow("gigId");
  });

  test("missing bandId fails validation", async () => {
    const doc = validGigRequest({ bandId: undefined });

    await expect(doc.validate()).rejects.toThrow("bandId");
  });

  test("missing venueId fails validation", async () => {
    const doc = validGigRequest({ venueId: undefined });

    await expect(doc.validate()).rejects.toThrow("venueId");
  });

  test("missing bandUserId fails validation", async () => {
    const doc = validGigRequest({ bandUserId: undefined });

    await expect(doc.validate()).rejects.toThrow("bandUserId");
  });

  test("missing venueUserId fails validation", async () => {
    const doc = validGigRequest({ venueUserId: undefined });

    await expect(doc.validate()).rejects.toThrow("venueUserId");
  });
});
