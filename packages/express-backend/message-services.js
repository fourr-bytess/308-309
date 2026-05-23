import Message from "./messages.js";

function getMessages(conversationId) {
  return Message.find({ conversationId }).sort({ createdAt: 1 });
}

function addMessage(message) {
  const newMessage = new Message(message);
  return newMessage.save();
}

function markMessagesRead(conversationId, userId) {
  return Message.updateMany(
    {
      conversationId,
      readByUserIds: { $ne: userId },
    },
    {
      $addToSet: { readByUserIds: userId },
    },
  );
}

function getUnreadMessagesCount(userId, conversationIds) {
  return Message.countDocuments({
    conversationId: { $in: conversationIds },
    senderUserId: { $ne: userId },
    readByUserIds: { $ne: userId },
  });
}

function findMessageById(id) {
  return Message.findById(id);
}

function findMessageByIdAndDelete(id) {
  return Message.findByIdAndDelete(id);
}

function getMessagesCount(query = {}) {
  return Message.countDocuments(query);
}

function getMessagesPaginated(limit, offset, query = {}) {
  return Message.find(query)
    .skip(offset)
    .limit(limit);
}

export default {
  getMessages,
  addMessage,
  markMessagesRead,
  getUnreadMessagesCount,
  findMessageById,
  findMessageByIdAndDelete,
  getMessagesCount,
  getMessagesPaginated,
};
