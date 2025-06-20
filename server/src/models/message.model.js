import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    image: {
      type: String,
    },
    file: {
      url: String,
      name: String,
      type: String,
      size: Number,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      type: {
        type: String,
        enum: ["like", "love", "laugh", "wow", "sad", "angry"],
      },
    }],
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ readBy: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
