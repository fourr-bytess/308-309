import Conversation from "./conversation.js";

function getConversations(bandId, venueId) {
  const query = {};

  if (bandId) query.bandId = bandId;
  if (venueId) query.venueId = venueId;

  return Conversation.find(query);
}

function getConversationsCount(filters) {
  return Conversation.countDocuments(filters);
}

function getConversationsPaginated(limit, offset, filters) {
  return Conversation.find(filters)
    .skip(offset)
    .limit(limit);
}

function addConversation(data) {
  const newConversation = new Conversation(data);
  return newConversation.save();
}

function findConversationById(id) {
  return Conversation.findById(id);
}

function findConversationByIdAndDelete(id) {
  return Conversation.findByIdAndDelete(id);
}

export default {
  getConversations,
  getConversationsCount,
  getConversationsPaginated,
  addConversation,
  findConversationById,
  findConversationByIdAndDelete,
};