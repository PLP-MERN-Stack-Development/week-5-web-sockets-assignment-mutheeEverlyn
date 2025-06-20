import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

// Index for faster queries
roomSchema.index({ members: 1 });
roomSchema.index({ createdBy: 1 });

const Room = mongoose.model("Room", roomSchema);

export default Room; 