import Message from "./messages.js";

function getMessages(conversationId) {
  return Message.find({ conversationId });
}

function getMessagesCount(filters) {
  return Message.countDocuments(filters);
}

function getMessagesPaginated(limit, offset, filters) {
  return Message.find(filters)
    .skip(offset)
    .limit(limit);
}

function addMessage(message) {
  const newMessage = new Message(message);
  return newMessage.save();
}

function findMessageById(id) {
  return Message.findById(id);
}

function findMessageByIdAndDelete(id) {
  return Message.findByIdAndDelete(id);
}

export default {
  getMessages,
  getMessagesCount,
  getMessagesPaginated,
  addMessage,
  findMessageById,
  findMessageByIdAndDelete,
};