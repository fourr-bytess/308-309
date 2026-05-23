import { expect, jest } from "@jest/globals";
import messageModel from "./messages.js";
import messageServices from "./message-services.js";

describe("Message Services Test Suite", () => {

  beforeEach(() => {
    jest.clearAllMocks();

    messageModel.find = jest.fn();
    messageModel.countDocuments = jest.fn();
    messageModel.findById = jest.fn();
    messageModel.findByIdAndDelete = jest.fn();

    jest.spyOn(messageModel.prototype, "save").mockReturnThis();
  });

  describe("Conversation Message Retrieval", () => {

    test("Testing retrieval of messages for a specific booking conversation -- success", async () => {

      messageModel.find.mockReturnValue({sort: jest.fn().mockResolvedValue([])});

      await messageServices.getMessages("conversation_123");

      expect(messageModel.find).toHaveBeenCalledWith({
        conversationId: "conversation_123",
      });
    });

  });

  describe("Message Pagination and Count", () => {

    test("Testing total message count retrieval -- pass", async () => {

      messageModel.countDocuments.mockResolvedValue(7);

      const result = await messageServices.getMessagesCount({});

      expect(result).toBe(7);

      expect(messageModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing paginated conversation message retrieval -- pass", async () => {

      const mockMessages = [
        {
          text: "We'd love to book your band for next Saturday night.",
        },
      ];

      messageModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockMessages),
        }),
      });

      const result = await messageServices.getMessagesPaginated(
        10,
        5,
        {}
      );

      expect(messageModel.find).toHaveBeenCalledWith({});

      expect(result).toEqual(mockMessages);
    });

  });

  describe("Message CRUD Operations", () => {

    test("Testing successful message creation between venue and band -- pass", async () => {

      const messageData = {
        text: "Can your band provide sound equipment for the performance?",
      };

      messageModel.prototype.save = jest
        .fn()
        .mockResolvedValue(messageData);

      const result = await messageServices.addMessage(messageData);

      expect(result).toEqual(messageData);

      expect(messageModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findMessageById -- pass", async () => {

      messageModel.findById.mockResolvedValue({
        text: "Looking forward to performing at your venue!",
      });

      await messageServices.findMessageById("message_111");

      expect(messageModel.findById).toHaveBeenCalledWith(
        "message_111"
      );
    });

    test("Testing successful message deletion -- pass", async () => {

      messageModel.findByIdAndDelete.mockResolvedValue({
        success: true,
      });

      await messageServices.findMessageByIdAndDelete("message_111");

      expect(messageModel.findByIdAndDelete).toHaveBeenCalledWith(
        "message_111"
      );
    });

  });

});