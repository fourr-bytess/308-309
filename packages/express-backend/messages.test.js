import mongoose from "mongoose";
import Message from "./messages.js";

describe("Message Model Test Suite", () => {

  test("Testing valid band-to-venue message creation -- pass", async () => {

    const validMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "band",
      senderUserId: "band_123",
      text: "Hey! We'd love to perform at your venue next Friday @ 5:00 pm.",
    });

    await expect(validMessage.validate()).resolves.not.toThrow();
  });

  test("Testing missing conversation ID for message -- fail", async () => {

    const invalidMessage = new Message({
      senderRole: "band",
      senderUserId: "band_123",
      text: "Are you still looking for live music?",
    });

    try {
      await invalidMessage.validate();
    } catch (error) {
      expect(error.message).toContain("conversationId");
    }
  });

  test("Testing invalid sender role in message -- fail", async () => {

    const invalidMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "manager",
      senderUserId: "manager_001",
      text: "This should fail validation.",
    });

    try {
      await invalidMessage.validate();
    } catch (error) {
      expect(error.message).toContain("sender");
    }
  });

  test("Testing missing sender ID -- fail", async () => {

    const invalidMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "venue",
      text: "Can your band bring sound equipment?",
    });

    try {
      await invalidMessage.validate();
    } catch (error) {
      expect(error.message).toContain("senderUserId");
    }
  });

  test("Testing missing message text -- fail", async () => {

    const invalidMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "band",
      senderUserId: "band_123",
    });

    try {
      await invalidMessage.validate();
    } catch (error) {
      expect(error.message).toContain("text");
    }
  });

  test("Testing message exceeding max length -- fail", async () => {

    const invalidMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "venue",
      senderUserId: "venue_456",
      text: "a".repeat(2001),
    });

    try {
      await invalidMessage.validate();
    } catch (error) {
      expect(error.message).toContain("text");
    }
  });

  test("Testing unread message defaults -- pass", async () => {

    const validMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderRole: "venue",
      senderUserId: "venue_456",
      text: "Your band has officially been booked !",
    });

    await validMessage.validate();

    expect(validMessage.readByUserIds).toEqual([]);
  });

});