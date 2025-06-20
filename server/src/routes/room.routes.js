import express from "express";
import {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
} from "../controllers/room.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Room routes
router.post("/", createRoom);
router.get("/", getRooms);
router.get("/:roomId", getRoom);
router.put("/:roomId", updateRoom);
router.delete("/:roomId", deleteRoom);
router.post("/:roomId/join", joinRoom);
router.post("/:roomId/leave", leaveRoom);

export default router; 