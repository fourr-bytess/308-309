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

export default {
  getConversationsByUser,
  findConversationByParticipants,
  addConversation,
  findConversationById,
  updateConversationLastMessage,
  markConversationRead,
  findConversationByIdAndDelete,
};
