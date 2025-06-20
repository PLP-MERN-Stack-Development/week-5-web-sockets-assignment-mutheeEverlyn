import express from "express";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  markMessageAsRead,
  addReaction,
  searchMessages,
  sendPrivateMessage,
  getPrivateMessages,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/room/:roomId", protectRoute, getMessages);
router.post("/room/:roomId", protectRoute, sendMessage);
router.post("/read/:messageId", protectRoute, markMessageAsRead);
router.post("/reaction/:messageId", protectRoute, addReaction);
router.get("/search", protectRoute, searchMessages);
router.get("/private/:userId", protectRoute, getPrivateMessages);
router.post("/private/:userId", protectRoute, sendPrivateMessage);

// File/image upload endpoint
router.post("/upload", protectRoute, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Return file info (in production, upload to cloud storage and return URL)
  res.status(200).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

export default router; 