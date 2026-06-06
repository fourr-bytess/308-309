import { expect, jest } from "@jest/globals";
import messageModel from "./messages.js";
import messageServices from "./message-services.js";

// Test-only workaround because message-services.js uses messageModel
// even though it imports the model as Message.
globalThis.messageModel = messageModel;

describe("Message Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    globalThis.messageModel = messageModel;

    messageModel.find = jest.fn();
    messageModel.countDocuments = jest.fn();
    messageModel.findById = jest.fn();
    messageModel.findByIdAndDelete = jest.fn();
    messageModel.updateMany = jest.fn();

    jest.spyOn(messageModel.prototype, "save").mockReturnThis();
  });

  describe("Conversation Message Retrieval", () => {
    test("Testing retrieval of messages for a specific booking conversation -- success", async () => {
      const mockSort = jest.fn().mockResolvedValue([]);

      messageModel.find.mockReturnValue({
        sort: mockSort,
      });

      const result = await messageServices.getMessages("conversation_123");

      expect(messageModel.find).toHaveBeenCalledWith({
        conversationId: "conversation_123",
      });

      expect(mockSort).toHaveBeenCalledWith({
        createdAt: 1,
      });

      expect(result).toEqual([]);
    });
  });

  describe("Message Pagination and Count", () => {
    test("Testing total message count retrieval -- pass", async () => {
      messageModel.countDocuments.mockResolvedValue(7);

      const result = await messageServices.getMessagesCount({});

      expect(result).toBe(7);
      expect(messageModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing total message count with default query -- pass", async () => {
      messageModel.countDocuments.mockResolvedValue(0);

      const result = await messageServices.getMessagesCount();

      expect(result).toBe(0);
      expect(messageModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing paginated conversation message retrieval -- pass", async () => {
      const mockMessages = [
        {
          text: "We'd love to book your band for next Saturday night.",
        },
      ];

      const mockLimit = jest.fn().mockResolvedValue(mockMessages);
      const mockSkip = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      messageModel.find.mockReturnValue({
        skip: mockSkip,
      });

      const result = await messageServices.getMessagesPaginated(10, 5, {});

      expect(messageModel.find).toHaveBeenCalledWith({});
      expect(mockSkip).toHaveBeenCalledWith(5);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockMessages);
    });

    test("Testing paginated messages with default query -- pass", async () => {
      const mockMessages = [
        {
          text: "Default query message",
        },
      ];

      const mockLimit = jest.fn().mockResolvedValue(mockMessages);
      const mockSkip = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      messageModel.find.mockReturnValue({
        skip: mockSkip,
      });

      const result = await messageServices.getMessagesPaginated(5, 0);

      expect(messageModel.find).toHaveBeenCalledWith({});
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockMessages);
    });
  });

  describe("Message CRUD Operations", () => {
    test("Testing successful message creation between venue and band -- pass", async () => {
      const messageData = {
        text: "Can your band provide sound equipment for the performance?",
      };

      messageModel.prototype.save = jest.fn().mockResolvedValue(messageData);

      const result = await messageServices.addMessage(messageData);

      expect(result).toEqual(messageData);
      expect(messageModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findMessageById -- pass", async () => {
      const mockMessage = {
        text: "Looking forward to performing at your venue!",
      };

      messageModel.findById.mockResolvedValue(mockMessage);

      const result = await messageServices.findMessageById("message_111");

      expect(messageModel.findById).toHaveBeenCalledWith("message_111");
      expect(result).toEqual(mockMessage);
    });

    test("Testing successful message deletion -- pass", async () => {
      const mockDeletedMessage = {
        success: true,
      };

      messageModel.findByIdAndDelete.mockResolvedValue(mockDeletedMessage);

      const result =
        await messageServices.findMessageByIdAndDelete("message_111");

      expect(messageModel.findByIdAndDelete).toHaveBeenCalledWith(
        "message_111"
      );

      expect(result).toEqual(mockDeletedMessage);
    });
  });

  describe("Testing message read operations", () => {
    test("Testing markMessagesRead updates documents -- pass", async () => {
      const mockUpdateResult = {
        modifiedCount: 2,
      };

      messageModel.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await messageServices.markMessagesRead(
        "conversation_123",
        "user_999"
      );

      expect(messageModel.updateMany).toHaveBeenCalledWith(
        {
          conversationId: "conversation_123",
          readByUserIds: { $ne: "user_999" },
        },
        {
          $addToSet: { readByUserIds: "user_999" },
        }
      );

      expect(result).toEqual(mockUpdateResult);
    });

    test("Testing getUnreadMessagesCount queries correctly -- pass", async () => {
      messageModel.countDocuments.mockResolvedValue(3);

      const result = await messageServices.getUnreadMessagesCount("user_999", [
        "c1",
        "c2",
      ]);

      expect(result).toBe(3);

      expect(messageModel.countDocuments).toHaveBeenCalledWith({
        conversationId: { $in: ["c1", "c2"] },
        senderUserId: { $ne: "user_999" },
        readByUserIds: { $ne: "user_999" },
      });
    });

    test("Testing getUnreadMessagesCount returns 0 when conversationIds is empty -- pass", async () => {
      const result = await messageServices.getUnreadMessagesCount(
        "user_999",
        []
      );

      expect(result).toBe(0);
      expect(messageModel.countDocuments).not.toHaveBeenCalled();
    });

    test("Testing getUnreadMessagesCount returns 0 when conversationIds is missing -- pass", async () => {
      const result = await messageServices.getUnreadMessagesCount("user_999");

      expect(result).toBe(0);
      expect(messageModel.countDocuments).not.toHaveBeenCalled();
    });

    test("Testing getUnreadMessagesCount returns 0 when conversationIds is null -- pass", async () => {
      const result = await messageServices.getUnreadMessagesCount(
        "user_999",
        null
      );

      expect(result).toBe(0);
      expect(messageModel.countDocuments).not.toHaveBeenCalled();
    });
  });
});