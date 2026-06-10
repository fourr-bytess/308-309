import { expect, jest } from "@jest/globals";
import conversationModel from "./conversation.js";
import conversationServices from "./conversation-services.js";
import userModel from "./user.js";
import gigModel from "./gig.js";
import bandModel from "./band.js";

function createFindSortMock(result) {
  const sort = jest.fn().mockResolvedValue(result);
  return { sort };
}

function createSelectLeanMock(result) {
  const lean = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ lean });
  return { select, lean };
}

describe("Conversation Services Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    conversationModel.find = jest.fn();
    conversationModel.findOne = jest.fn();
    conversationModel.countDocuments = jest.fn();
    conversationModel.findById = jest.fn();
    conversationModel.findByIdAndUpdate = jest.fn();
    conversationModel.findByIdAndDelete = jest.fn();

    jest
      .spyOn(conversationModel.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve(this);
      });

    userModel.find = jest.fn();
    gigModel.find = jest.fn();
    bandModel.find = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getConversationsByUser", () => {
    test("gets conversations for a user and adds other user display name and gig name", async () => {
      const conversationAsBandUser = {
        _id: "conv1",
        bandUserId: "user_123",
        venueUserId: "venue_user_1",
        gigId: "gig_1",
        toObject: jest.fn().mockReturnValue({
          _id: "conv1",
          bandUserId: "user_123",
          venueUserId: "venue_user_1",
          gigId: "gig_1",
          lastMessage: "Hello from band",
        }),
      };

      const conversationAsVenueUser = {
        _id: "conv2",
        bandUserId: "band_user_2",
        venueUserId: "user_123",
        gigId: "gig_2",
        toObject: jest.fn().mockReturnValue({
          _id: "conv2",
          bandUserId: "band_user_2",
          venueUserId: "user_123",
          gigId: "gig_2",
          lastMessage: "Hello from venue",
        }),
      };

      const findSortMock = createFindSortMock([
        conversationAsBandUser,
        conversationAsVenueUser,
      ]);

      conversationModel.find.mockReturnValue(findSortMock);

      const userQueryMock = createSelectLeanMock([
        { _id: "venue_user_1", display_name: "Golden Stage Venue" },
        { _id: "band_user_2", display_name: "Midnight Band" },
      ]);

      userModel.find.mockReturnValue(userQueryMock);

      const gigQueryMock = createSelectLeanMock([
        { _id: "gig_1", name: "Friday Rock Night" },
        { _id: "gig_2", name: "Saturday Acoustic Set" },
      ]);

      gigModel.find.mockReturnValue(gigQueryMock);

      const bandQueryMock = createSelectLeanMock([]);
      bandModel.find.mockReturnValue(bandQueryMock);

      const result = await conversationServices.getConversationsByUser(
        "user_123"
      );

      expect(conversationModel.find).toHaveBeenCalledWith({
        $or: [{ bandUserId: "user_123" }, { venueUserId: "user_123" }],
      });

      expect(findSortMock.sort).toHaveBeenCalledWith({ lastMessageTime: -1 });

      expect(userModel.find).toHaveBeenCalledWith({
        _id: { $in: ["venue_user_1", "band_user_2"] },
      });

      expect(userQueryMock.select).toHaveBeenCalledWith("display_name");
      expect(userQueryMock.lean).toHaveBeenCalled();

      expect(gigModel.find).toHaveBeenCalledWith({
        _id: { $in: ["gig_1", "gig_2"] },
      });

      expect(gigQueryMock.select).toHaveBeenCalledWith("name");
      expect(gigQueryMock.lean).toHaveBeenCalled();

      expect(result).toEqual([
        {
          _id: "conv1",
          bandUserId: "user_123",
          venueUserId: "venue_user_1",
          gigId: "gig_1",
          lastMessage: "Hello from band",
          otherUserDisplayName: "Golden Stage Venue",
          gigName: "Friday Rock Night",
        },
        {
          _id: "conv2",
          bandUserId: "band_user_2",
          venueUserId: "user_123",
          gigId: "gig_2",
          lastMessage: "Hello from venue",
          otherUserDisplayName: "Midnight Band",
          gigName: "Saturday Acoustic Set",
        },
      ]);
    });

    test("gets conversations and uses empty strings when user or gig names are missing", async () => {
      const conversationWithoutGig = {
        _id: "conv3",
        bandUserId: "user_123",
        venueUserId: "unknown_user",
        gigId: null,
        toObject: jest.fn().mockReturnValue({
          _id: "conv3",
          bandUserId: "user_123",
          venueUserId: "unknown_user",
          gigId: null,
          lastMessage: "No names found",
        }),
      };

      const findSortMock = createFindSortMock([conversationWithoutGig]);
      conversationModel.find.mockReturnValue(findSortMock);

      const userQueryMock = createSelectLeanMock([]);
      userModel.find.mockReturnValue(userQueryMock);

      const gigQueryMock = createSelectLeanMock([]);
      gigModel.find.mockReturnValue(gigQueryMock);

      const bandQueryMock = createSelectLeanMock([]);
      bandModel.find.mockReturnValue(bandQueryMock);

      const result = await conversationServices.getConversationsByUser(
        "user_123"
      );

      expect(gigModel.find).toHaveBeenCalledWith({
        _id: { $in: [] },
      });

      expect(result).toEqual([
        {
          _id: "conv3",
          bandUserId: "user_123",
          venueUserId: "unknown_user",
          gigId: null,
          lastMessage: "No names found",
          otherUserDisplayName: "",
          gigName: "",
        },
      ]);
    });

    test("gets empty conversation list for user", async () => {
      const findSortMock = createFindSortMock([]);
      conversationModel.find.mockReturnValue(findSortMock);

      const userQueryMock = createSelectLeanMock([]);
      userModel.find.mockReturnValue(userQueryMock);

      const gigQueryMock = createSelectLeanMock([]);
      gigModel.find.mockReturnValue(gigQueryMock);

      const bandQueryMock = createSelectLeanMock([]);
      bandModel.find.mockReturnValue(bandQueryMock);

      const result = await conversationServices.getConversationsByUser(
        "user_123"
      );

      expect(result).toEqual([]);

      expect(userModel.find).toHaveBeenCalledWith({
        _id: { $in: [] },
      });

      expect(gigModel.find).toHaveBeenCalledWith({
        _id: { $in: [] },
      });
    });
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

      await conversationServices.getConversations("sunset_riders_band", null);

      expect(conversationModel.find).toHaveBeenCalledWith({
        bandId: "sunset_riders_band",
      });
    });

    test("Testing conversation retrieval using only venue filter -- pass", async () => {
      conversationModel.find.mockResolvedValue([]);

      await conversationServices.getConversations(null, "downtown_venue");

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
        bandId: "64b000000000000000000001",
        venueId: "64b000000000000000000002",
        bandUserId: "band_user_1",
        venueUserId: "venue_user_1",
      };

      const result = await conversationServices.addConversation(data);

      expect(String(result.bandId)).toBe(data.bandId);
      expect(String(result.venueId)).toBe(data.venueId);
      expect(result.bandUserId).toBe(data.bandUserId);
      expect(result.venueUserId).toBe(data.venueUserId);

      expect(result.gigId).toBeNull();
      expect(result.lastMessage).toBe("");
      expect(result.lastMessageTime).toBeDefined();

      expect(conversationModel.prototype.save).toHaveBeenCalled();
    });

    test("Testing findConversationById -- pass", async () => {
      conversationModel.findById.mockResolvedValue({
        lastMessage: "Are you available next Saturday night?",
      });

      await conversationServices.findConversationById("conversation_123");

      expect(conversationModel.findById).toHaveBeenCalledWith(
        "conversation_123"
      );
    });

    test("Testing successful conversation deletion -- pass", async () => {
      conversationModel.findByIdAndDelete.mockResolvedValue({});

      await conversationServices.findConversationByIdAndDelete(
        "conversation_123"
      );

      expect(conversationModel.findByIdAndDelete).toHaveBeenCalledWith(
        "conversation_123"
      );
    });
  });

  describe("Conversation Participants", () => {
    test("Testing findConversationByParticipants with all fields -- pass", async () => {
      conversationModel.findOne.mockResolvedValue({});

      const participants = {
        gigId: "g1",
        bandId: "b1",
        venueId: "v1",
        bandUserId: "bu1",
        venueUserId: "vu1",
      };

      await conversationServices.findConversationByParticipants(participants);

      expect(conversationModel.findOne).toHaveBeenCalledWith({
        gigId: "g1",
        bandId: "b1",
        venueId: "v1",
        bandUserId: "bu1",
        venueUserId: "vu1",
      });
    });

    test("Testing findConversationByParticipants without gigId -- pass", async () => {
      conversationModel.findOne.mockResolvedValue(null);

      const participants = {
        bandId: "b1",
        venueId: "v1",
        bandUserId: "bu1",
        venueUserId: "vu1",
      };

      await conversationServices.findConversationByParticipants(participants);

      expect(conversationModel.findOne).toHaveBeenCalledWith({
        gigId: null,
        bandId: "b1",
        venueId: "v1",
        bandUserId: "bu1",
        venueUserId: "vu1",
      });
    });

    test("Testing findConversationByParticipants for band-to-band chat -- pass", async () => {
      conversationModel.findOne.mockResolvedValue({});

      const participants = {
        bandId: "b1",
        otherBandId: "b2",
        bandUserId: "bu1",
        venueUserId: "bu2",
      };

      await conversationServices.findConversationByParticipants(participants);

      expect(conversationModel.findOne).toHaveBeenCalledWith({
        gigId: null,
        bandId: "b1",
        otherBandId: "b2",
        venueId: null,
        bandUserId: "bu1",
        venueUserId: "bu2",
      });
    });
  });

  describe("Conversation Last Message", () => {
    test("Testing updateConversationLastMessage -- pass", async () => {
      conversationModel.findByIdAndUpdate.mockResolvedValue({});

      await conversationServices.updateConversationLastMessage(
        "conv_123",
        "New text"
      );

      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "conv_123",
        {
          lastMessage: "New text",
          lastMessageTime: expect.any(Date),
        },
        { new: true }
      );
    });
  });

  describe("Conversation Read Status", () => {
    test("Testing markConversationRead when conversation is found -- pass", async () => {
      const mockConversation = { id: "conv_123" };
      conversationModel.findById.mockResolvedValue(mockConversation);

      const result = await conversationServices.markConversationRead(
        "conv_123",
        "user_123"
      );

      expect(result).toEqual(mockConversation);
      expect(conversationModel.findById).toHaveBeenCalledWith("conv_123");
    });

    test("Testing markConversationRead when conversation is null -- pass", async () => {
      conversationModel.findById.mockResolvedValue(null);

      const result = await conversationServices.markConversationRead(
        "conv_123",
        "user_123"
      );

      expect(result).toBeNull();
      expect(conversationModel.findById).toHaveBeenCalledWith("conv_123");
    });
  });

  describe("Conversation Pagination and Count", () => {
    test("Testing total conversation count retrieval with empty query -- pass", async () => {
      conversationModel.countDocuments.mockResolvedValue(5);

      const result = await conversationServices.getConversationsCount({});

      expect(result).toBe(5);
      expect(conversationModel.countDocuments).toHaveBeenCalledWith({});
    });

    test("Testing total conversation count retrieval with query -- pass", async () => {
      conversationModel.countDocuments.mockResolvedValue(2);

      const query = { bandId: "band_123" };
      const result = await conversationServices.getConversationsCount(query);

      expect(result).toBe(2);
      expect(conversationModel.countDocuments).toHaveBeenCalledWith(query);
    });

    test("Testing paginated conversation retrieval -- pass", async () => {
      const mockConversations = [
        {
          id: 1,
          lastMessage: "Looking forward to hosting your band!",
        },
      ];

      const mockLimit = jest.fn().mockResolvedValue(mockConversations);
      const mockSkip = jest.fn().mockReturnValue({
        limit: mockLimit,
      });

      conversationModel.find.mockReturnValue({
        skip: mockSkip,
      });

      const result = await conversationServices.getConversationsPaginated(
        10,
        5,
        { venueId: "venue_123" }
      );

      expect(result).toEqual(mockConversations);

      expect(conversationModel.find).toHaveBeenCalledWith({
        venueId: "venue_123",
      });

      expect(mockSkip).toHaveBeenCalledWith(5);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });
});