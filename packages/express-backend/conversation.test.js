import mongoose from "mongoose";
import Conversation from "./conversation.js";

describe("Conversation Model Test Suite", () => {

  test("Testing valid conversation creation -- pass", async () => {

    const validConversation = new Conversation({
      bandId: new mongoose.Types.ObjectId(),
      venueId: new mongoose.Types.ObjectId(),
      bandUserId: "user_band_123",
      venueUserId: "user_venue_456",
      lastMessage: "Hello",
    });

    await expect(validConversation.validate()).resolves.not.toThrow();
  });

  test("Testing missing bandId -- fail", async () => {

    const invalidConversation = new Conversation({
      venueId: new mongoose.Types.ObjectId(),
    });

    try {
      await invalidConversation.validate();
    } catch (error) {
      expect(error.message).toContain("bandId");
    }
  });

  test("Testing missing venueId -- fail", async () => {

    const invalidConversation = new Conversation({
      bandId: new mongoose.Types.ObjectId(),
    });

    try {
      await invalidConversation.validate();
    } catch (error) {
      expect(error.message).toContain("venueId");
    }
  });

  test("Testing default lastMessageTime -- pass", async () => {

    const validConversation = new Conversation({
      bandId: new mongoose.Types.ObjectId(),
      venueId: new mongoose.Types.ObjectId(),
      bandUserId: "user_band_123",
      venueUserId: "user_venue_456",
    });

    await validConversation.validate();

    expect(validConversation.lastMessageTime).toBeDefined();
  });

});