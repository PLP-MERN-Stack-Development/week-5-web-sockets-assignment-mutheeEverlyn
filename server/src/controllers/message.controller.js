import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Room from "../models/room.model.js";
import { getIO } from "../lib/socket.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Check if user is a member of the room
    const room = await Room.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const messages = await Message.find({ room: roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "fullName profilePic")
      .populate("room", "name");

    // Mark messages as read
    await Message.updateMany(
      {
        room: roomId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Check if user is a member of the room
    const room = await Room.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const messages = await Message.find({
      roomId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "fullName profilePic")
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        roomId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.log("Error in getRoomMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const { roomId } = req.params;
    const senderId = req.user._id;

    // Check if room exists and user is a member
    const room = await Room.findOne({
      _id: roomId,
      members: senderId,
    });

    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const newMessage = new Message({
      content,
      sender: senderId,
      room: roomId,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "fullName profilePic")
      .populate("room", "name");

    const io = getIO();
    io.to(roomId).emit("newMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendRoomMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text, image, file } = req.body;

    // Check if room exists and user is a member
    const room = await Room.findOne({
      _id: roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const newMessage = new Message({
      senderId: req.user._id,
      roomId,
      text,
      image,
      file,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "fullName profilePic");

    // Emit socket event to all room members
    room.members.forEach(memberId => {
      if (memberId.toString() !== req.user._id.toString()) {
        io.to(memberId.toString()).emit("newMessage", newMessage);
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendRoomMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is a room member
    const room = await Room.findOne({
      _id: message.room,
      members: req.user._id,
    });
    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    message.readBy.addToSet(req.user._id);
    await message.save();

    // Emit socket event
    const io = getIO();
    room.members.forEach(memberId => {
      if (memberId.toString() !== req.user._id.toString()) {
        io.to(memberId.toString()).emit("messageRead", {
          messageId: message._id,
          userId: req.user._id,
        });
      }
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in markMessageAsRead controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is a room member
    const room = await Room.findOne({
      _id: message.room,
      members: req.user._id,
    });
    if (!room) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    // Add or update reaction
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (existingReactionIndex !== -1) {
      if (message.reactions[existingReactionIndex].type === reaction) {
        // Remove reaction if it's the same
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update reaction
        message.reactions[existingReactionIndex].type = reaction;
      }
    } else {
      // Add new reaction
      message.reactions.push({
        userId: req.user._id,
        type: reaction,
      });
    }

    await message.save();

    // Emit socket event
    const io = getIO();
    room.members.forEach(memberId => {
      if (memberId.toString() !== req.user._id.toString()) {
        io.to(memberId.toString()).emit("messageReaction", {
          messageId: message._id,
          userId: req.user._id,
          reaction,
        });
      }
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in addReaction controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [
        {
          senderId: userId,
          text: { $regex: query, $options: "i" },
        },
        {
          recipientId: userId,
          text: { $regex: query, $options: "i" },
        },
        {
          roomId: { $exists: true },
          text: { $regex: query, $options: "i" },
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic")
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in searchMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendPrivateMessage = async (req, res) => {
  try {
    const { userId } = req.params; // recipient
    const { content, image, file } = req.body;
    const senderId = req.user._id;

    if (!content && !image && !file) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const newMessage = new Message({
      content,
      sender: senderId,
      recipient: userId,
      image,
      file,
    });
    await newMessage.save();
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "fullName profilePic");

    // Emit to both users if using socket.io
    const io = getIO();
    io.to(senderId.toString()).emit("newMessage", populatedMessage);
    io.to(userId.toString()).emit("newMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendPrivateMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPrivateMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Find messages where (sender=myId and recipient=userId) or (sender=userId and recipient=myId)
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "fullName profilePic");

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getPrivateMessages controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
