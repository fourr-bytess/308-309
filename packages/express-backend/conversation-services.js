import Conversation from "./conversation.js";
import User from "./user.js"
import Gig from "./gig.js";

async function getConversationsByUser(userId) {
  const conversations = await Conversation.find({
    $or: [{ bandUserId: userId }, { venueUserId: userId }],
  }).sort({ lastMessageTime: -1 });

  const otherUserIds = conversations.map((conversation) =>
    String(conversation.bandUserId) === String(userId)
      ? conversation.venueUserId
      : conversation.bandUserId
  );

  const users = await User.find({ _id: { $in: otherUserIds } })
    .select("display_name")
    .lean();

  const gigIds = conversations
  .map((conversation) => conversation.gigId)
  .filter(Boolean);

  const gigs = await Gig.find({ _id: { $in: gigIds } })
    .select("name")
    .lean();

  const gigNamesById = new Map(
    gigs.map((gig) => [String(gig._id), gig.name])
  );

  const namesById = new Map(
    users.map((user) => [String(user._id), user.display_name])
  );

  return conversations.map((conversation) => {
    const otherUserId =
      String(conversation.bandUserId) === String(userId)
        ? conversation.venueUserId
        : conversation.bandUserId;

    return {
      ...conversation.toObject(),
      otherUserDisplayName: namesById.get(String(otherUserId)) || "",
      gigName: gigNamesById.get(String(conversation.gigId)) || "",
    };
  });
}

function findConversationByParticipants({
  gigId,
  bandId,
  venueId,
  bandUserId,
  venueUserId,
}) {
  return Conversation.findOne({ gigId, bandId, venueId, bandUserId, venueUserId });
}

function addConversation(data) {
  const newConversation = new Conversation(data);
  return newConversation.save();
}

function findConversationById(id) {
  return Conversation.findById(id);
}

function updateConversationLastMessage(id, text) {
  return Conversation.findByIdAndUpdate(
    id,
    {
      lastMessage: text,
      lastMessageTime: new Date(),
    },
    { new: true }
  );
}

function markConversationRead(conversationId, userId) {
  return Conversation.findById(conversationId).then((conversation) => {
    if (!conversation) return null;
    return conversation;
  });
}

function findConversationByIdAndDelete(id) {
  return Conversation.findByIdAndDelete(id);
}

function getConversations(bandIdFilter, venueIdFilter) {
  const query = {};
  if (bandIdFilter) query.bandId = bandIdFilter; // Or bandUserId depending on schema intent
  if (venueIdFilter) query.venueId = venueIdFilter;
  return Conversation.find(query);
}

function getConversationsCount(query = {}) {
  return Conversation.countDocuments(query);
}

function getConversationsPaginated(limit, offset, query = {}) {
  return Conversation.find(query)
    .skip(offset)
    .limit(limit);
}

export default {
  getConversationsByUser,
  findConversationByParticipants,
  addConversation,
  findConversationById,
  updateConversationLastMessage,
  markConversationRead,
  findConversationByIdAndDelete,
  getConversations,
  getConversationsCount,
  getConversationsPaginated,
};
