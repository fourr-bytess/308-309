import mongoose from "mongoose";

const conversationSchema = new Schema({
  bandId: {
    type: Schema.Types.ObjectId,
    ref: "Band",
    required: true,
    index: true,
  },
  venueId: {
    type: Schema.Types.ObjectId,
    ref: "Venue",
    required: true,
    index: true,
  },

  slotID: {
    type: Schema.Types.ObjectId,
    ref: "Availability",
  },

  bookingRequestId: {
    type: Schema.Types.ObjectId,
    ref: "BookingRequest",
  },

  lastMessageTime: {
    type: Date,
    default: Date.now,
    index: true,
  },

  lastMessage: {
    type: String,
  },
});

conversationSchema.index(
  {
    bandId: 1,
    venueID: 1,
  },
  {
    unique: true,
  },
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
