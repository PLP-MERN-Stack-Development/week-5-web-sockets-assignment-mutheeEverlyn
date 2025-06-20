import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import roomRoutes from "./routes/room.routes.js";
import { createServer } from "http";
import { initializeSocket } from "./lib/socket.js";
import path from "path";
import { fileURLToPath } from 'url';
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/rooms", roomRoutes);

// Socket.io setup
initializeSocket(httpServer);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 5001;
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  }); 