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
    test("should build correct query", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations("band1", "venue1");

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "band1",
        venueId: "venue1",
      });
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

});