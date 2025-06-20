import Room from "../models/room.model.js";
import User from "../models/user.model.js";
import { getIO } from "../lib/socket.js";

export const createRoom = async (req, res) => {
  try {
    const { name, description, isPrivate, members = [] } = req.body;
    const createdBy = req.user._id;

    // Ensure the creator is included in members
    const allMembers = [...new Set([...members, createdBy])];

    const newRoom = new Room({
      name,
      description,
      createdBy,
      members: allMembers,
      isPrivate,
    });

    await newRoom.save();

    const populatedRoom = await Room.findById(newRoom._id)
      .populate("members", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    const io = getIO();
    io.to(allMembers.map(m => m.toString())).emit("newRoom", populatedRoom);

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error("Error in createRoom controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({ members: userId })
      .populate("members", "fullName profilePic")
      .populate("createdBy", "fullName profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error in getRooms controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({
      _id: roomId,
      $or: [
        { isPrivate: false },
        { members: userId },
      ],
    }).populate("members", "fullName profilePic");

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.status(200).json(room);
  } catch (error) {
    console.log("Error in getRoom controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, isPrivate, members } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({
      _id: roomId,
      createdBy: userId, // Only creator can update
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Update fields
    if (name) room.name = name;
    if (description) room.description = description;
    if (typeof isPrivate === "boolean") room.isPrivate = isPrivate;
    if (members) {
      room.members = [...new Set([...members, userId])]; // Ensure creator stays a member
    }

    await room.save();
    await room.populate("members", "fullName profilePic");

    // Notify all members about the room update
    room.members.forEach(member => {
      io.to(member._id.toString()).emit("roomUpdated", room);
    });

    res.status(200).json(room);
  } catch (error) {
    console.log("Error in updateRoom controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({
      _id: roomId,
      createdBy: userId, // Only creator can delete
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Notify all members about the room deletion
    room.members.forEach(member => {
      io.to(member._id.toString()).emit("roomDeleted", roomId);
    });

    await room.deleteOne();

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.log("Error in deleteRoom controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.isPrivate) {
      return res.status(403).json({ error: "Cannot join private room" });
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
      await room.populate("members", "fullName profilePic");

      // Notify all members about the new member
      room.members.forEach(member => {
        io.to(member._id.toString()).emit("roomUpdated", room);
      });
    }

    res.status(200).json(room);
  } catch (error) {
    console.log("Error in joinRoom controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ error: "Room creator cannot leave" });
    }

    room.members = room.members.filter(id => id.toString() !== userId.toString());
    await room.save();
    await room.populate("members", "fullName profilePic");

    // Notify all members about the member leaving
    room.members.forEach(member => {
      io.to(member._id.toString()).emit("roomUpdated", room);
    });

    res.status(200).json(room);
  } catch (error) {
    console.log("Error in leaveRoom controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}; 