import mongoose from "mongoose";

const messageSchema = new Schema({
  convserationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },

  sender: {
    type: String,
    enum: ["band", "venue", "user"],
    required: true,
  },

  senderId: {
    type: String,
    required: true,
    index: true,
  },

  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },

  readByBand: {
    type: Boolean,
    default: false,
  },

  readByVenue: {
    type: Boolean,
    default: false,
  },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
