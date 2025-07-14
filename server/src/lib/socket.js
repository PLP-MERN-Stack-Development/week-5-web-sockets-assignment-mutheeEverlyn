import { Server } from "socket.io";

// Store online users and their socket IDs
const userSocketMap = {}; // {userId: socketId}
const userRooms = {}; // {userId: [roomIds]}
const typingUsers = {}; // {roomId: {userId: timestamp}}

let io;

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173",
      "https://week-5-web-sockets-assignment-muthe.vercel.app"],
      credentials: true,
    },
  });

  setupSocketHandlers(io);
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
      userRooms[userId] = ['global']; // Default to global room
    }

    // Emit online users to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle joining rooms
    socket.on("joinRoom", (roomId) => {
      if (!userRooms[userId]) userRooms[userId] = [];
      if (!userRooms[userId].includes(roomId)) {
        userRooms[userId].push(roomId);
        socket.join(roomId);
        io.to(roomId).emit("userJoined", { userId, roomId });
      }
    });

    // Handle leaving rooms
    socket.on("leaveRoom", (roomId) => {
      if (userRooms[userId]) {
        userRooms[userId] = userRooms[userId].filter(id => id !== roomId);
        socket.leave(roomId);
        io.to(roomId).emit("userLeft", { userId, roomId });
      }
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, isTyping }) => {
      if (isTyping) {
        typingUsers[roomId] = { ...typingUsers[roomId], [userId]: Date.now() };
      } else {
        if (typingUsers[roomId]) {
          delete typingUsers[roomId][userId];
        }
      }
      io.to(roomId).emit("typingUsers", typingUsers[roomId] || {});
    });

    // Handle read receipts
    socket.on("messageRead", ({ messageId, roomId }) => {
      io.to(roomId).emit("messageRead", { messageId, userId });
    });

    // Handle message reactions
    socket.on("messageReaction", ({ messageId, reaction, roomId }) => {
      io.to(roomId).emit("messageReaction", { messageId, userId, reaction });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      delete userSocketMap[userId];
      delete userRooms[userId];
      
      // Clean up typing indicators
      Object.keys(typingUsers).forEach(roomId => {
        if (typingUsers[roomId][userId]) {
          delete typingUsers[roomId][userId];
        }
      });

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
}
