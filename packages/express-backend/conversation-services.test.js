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

  describe("Conversation Retrieval and Filtering", () => {

    test("Testing conversation retrieval between a band and venue -- pass", async () => {

      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(
        "midnight_band",
        "golden_stage_venue"
      );

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "midnight_band",
        venueId: "golden_stage_venue",
      });
    });

    test("Testing conversation retrieval using only band filter -- pass", async () => {

      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(
        "sunset_riders_band",
        null
      );

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "sunset_riders_band",
      });
    });

    test("Testing conversation retrieval using only venue filter -- pass", async () => {

      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(
        null,
        "downtown_venue"
      );

      expect(conversationModel.find).toHaveBeenCalledWith({
        venueId: "downtown_venue",
      });
    });

    test("Testing conversation retrieval with no filters applied -- pass", async () => {

      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(null, null);

      expect(conversationModel.find).toHaveBeenCalledWith({});
    });

  });

  describe("Conversation CRUD Operations", () => {

    test("Testing successful conversation creation for booking discussion -- pass", async () => {

      const data = {
        bandId: "midnight_band",
        venueId: "golden_stage_venue",
      };

      conversationModel.prototype.save = jest
        .fn()
        .mockResolvedValue(data);

      const result = await conversationServices.addConversation(data);

      expect(result).toEqual(data);

      expect(conversationModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findConversationById -- pass", async () => {

      conversationModel.findById.mockResolvedValue({
        lastMessage: "Are you available next Saturday night?",
      });

      await conversationServices.findConversationById(
        "conversation_123"
      );

      expect(conversationModel.findById).toHaveBeenCalledWith(
        "conversation_123"
      );
    });

    test("Testing successful conversation deletion -- pass", async () => {

      conversationModel.findByIdAndDelete.mockResolvedValue({});

      await conversationServices.findConversationByIdAndDelete(
        "conversation_123"
      );

      expect(
        conversationModel.findByIdAndDelete
      ).toHaveBeenCalledWith("conversation_123");
    });

  });

  describe("Conversation Pagination and Count", () => {

    test("Testing total conversation count retrieval -- pass", async () => {

      conversationModel.countDocuments.mockResolvedValue(5);

      const result = await conversationServices.getConversationsCount(
        {}
      );

      expect(result).toBe(5);

      expect(
        conversationModel.countDocuments
      ).toHaveBeenCalled();
    });

    test("Testing paginated conversation retrieval -- pass", async () => {

      const mockConversations = [
        {
          id: 1,
          lastMessage: "Looking forward to hosting your band!",
        },
      ];

      conversationModel.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockConversations),
        }),
      });

      await conversationServices.getConversationsPaginated(
        10,
        0,
        {}
      );

      expect(conversationModel.find).toHaveBeenCalled();
    });

  });

});