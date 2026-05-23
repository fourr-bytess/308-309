import Conversation from "./conversation.js";

function getConversationsByUser(userId) {
  return Conversation.find({
    $or: [{ bandUserId: userId }, { venueUserId: userId }],
  }).sort({ lastMessageTime: -1 });
}

function findConversationByParticipants({
  bandId,
  venueId,
  bandUserId,
  venueUserId,
}) {
  return Conversation.findOne({ bandId, venueId, bandUserId, venueUserId });
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
