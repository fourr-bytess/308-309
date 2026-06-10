import mongoose from "mongoose";

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    bandId: {
      type: Schema.Types.ObjectId,
      ref: "Band",
      required: true,
      index: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      ref: "venue",
      required: function requiredVenueUnlessBandChat() {
        return !this.otherBandId;
      },
      default: null,
      index: true,
    },
    otherBandId: {
      type: Schema.Types.ObjectId,
      ref: "Band",
      default: null,
      index: true,
    },
    gigId: {
      type: Schema.Types.ObjectId,
      ref: "Gig",
      default: null,
      index: true,
    },
    bandUserId: {
      type: String,
      required: true,
      index: true,
    },
    venueUserId: {
      type: String,
      required: true,
      index: true,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

conversationSchema.index(
  {
    gigId: 1,
    bandId: 1,
    venueId: 1,
    otherBandId: 1,
    bandUserId: 1,
    venueUserId: 1,
  },
  { unique: true },
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
