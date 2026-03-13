import { expect, jest } from "@jest/globals";
import conversationModel from "./conversation.js";
import conversationServices from "./conversation-services.js";

describe("Conversation Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    conversationModel.find = jest.fn();
    conversationModel.countDocuments = jest.fn();
    conversationModel.findById = jest.fn();
    conversationModel.findByIdAndDelete = jest.fn();
    jest.spyOn(conversationModel.prototype, "save").mockReturnThis();
  });

  describe("getConversations", () => {
    test("should build correct query with both filters", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations("band1", "venue1");

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "band1",
        venueId: "venue1",
      });
    });

    test("should handle only bandId filter", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations("bandOnly", null);

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "bandOnly",
      });
    });

    test("should handle only venueId filter", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(null, "venueOnly");

      expect(conversationModel.find).toHaveBeenCalledWith({
        venueId: "venueOnly",
      });
    });

    test("should handle no filters", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(null, null);

      expect(conversationModel.find).toHaveBeenCalledWith({});
    });
  });

  describe("CRUD operations", () => {
    test("addConversation -- success", async () => {
      const data = { bandId: "1", venueId: "2" };

      conversationModel.prototype.save = jest.fn().mockResolvedValue(data);

      const result = await conversationServices.addConversation(data);

      expect(result).toEqual(data);
      expect(conversationModel.prototype.save).toHaveBeenCalled();
    });

    test("findConversationById -- success", async () => {
      conversationModel.findById.mockResolvedValue({});

      await conversationServices.findConversationById("123");

      expect(conversationModel.findById).toHaveBeenCalledWith("123");
    });

    test("findConversationByIdAndDelete -- success", async () => {
      conversationModel.findByIdAndDelete.mockResolvedValue({});

      await conversationServices.findConversationByIdAndDelete("123");

      expect(conversationModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    });
  });
  describe("Pagination and Count", () => {
    test("getConversationsCount -- success", async () => {
      conversationModel.countDocuments.mockResolvedValue(5);

      const result = await conversationServices.getConversationsCount({});

      expect(result).toBe(5);
      expect(conversationModel.countDocuments).toHaveBeenCalled();
    });

    test("getConversationsPaginated -- success", async () => {
      const mockConversations = [{ id: 1 }];

      conversationModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockConversations),
        }),
      });

      await conversationServices.getConversationsPaginated(10, 0, {});

      expect(conversationModel.find).toHaveBeenCalled();
    });
  });
});
