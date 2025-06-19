// server.js - Main server file for Socket.io chat application

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with proper CORS and transport options
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true },
  room: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  reactions: [{
    type: { type: String, enum: ['like', 'heart'] },
    user: String,
    timestamp: { type: Date, default: Date.now }
  }],
  attachments: [{
    filename: String,
    path: String,
    type: String
  }]
});

const Message = mongoose.model('Message', messageSchema);

// Chat Room Schema
const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  members: [{ type: String }]
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  sender: { type: String, required: true },
  type: { type: String, enum: ['message', 'mention', 'room_invite'], required: true },
  content: String,
  room: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password // In a real app, you should hash the password
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password (in a real app, you should compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get online users endpoint
app.get('/api/users/online', authenticateToken, async (req, res) => {
  try {
    const onlineUsers = await User.find({ online: true }).select('username');
    res.json(onlineUsers.map(user => user.username));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Room Routes
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await ChatRoom.find();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const username = req.user.username;

    // Check if room already exists
    const existingRoom = await ChatRoom.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room name already exists' });
    }

    // Create new room
    const room = new ChatRoom({
      name,
      createdBy: username,
      members: [username]
    });

    await room.save();
    console.log('Room created:', room);

    // Notify all clients about new room
    io.emit('roomCreated', room);

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Add user to room members if not already a member
    if (!room.members.includes(req.user.username)) {
      room.members.push(req.user.username);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

app.get('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Notification Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.username })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.username, read: false },
      { read: true }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle authentication
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('No token provided, disconnecting socket');
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const username = decoded.username;
    console.log('Authenticated user:', username);

    // Update user status
    User.findOneAndUpdate(
      { username },
      { online: true, lastSeen: new Date() },
      { new: true }
    ).catch(err => console.error('Error updating user status:', err));

    socket.username = username;
    socket.join(username); // Join user's personal room

    // Broadcast user's online status
    io.emit('userStatus', { username, online: true });

    // Handle room joining
    socket.on('join', async (room) => {
      console.log(`${username} joining room: ${room}`);
      socket.join(room);
      
      // Notify room members
      socket.to(room).emit('userJoined', { username, room });

      // Send message history
      try {
        const messages = await Message.find({ room })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
        
        // Send messages in chronological order
        socket.emit('messageHistory', messages.reverse());
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    });

    // Handle messages
    socket.on('message', async (message, callback) => {
      console.log('Received message:', message);
      try {
        // Validate message data
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message format');
        }

        if (!message.content || typeof message.content !== 'string' || !message.content.trim()) {
          throw new Error('Message content is required');
        }

        if (!message.room || typeof message.room !== 'string' || !message.room.trim()) {
          throw new Error('Room name is required');
        }

        // Find the room to ensure it exists
        const room = await ChatRoom.findOne({ name: message.room });
        if (!room) {
          throw new Error('Room not found');
        }

        // Check if user is a member of the room
        if (!room.members.includes(username)) {
          throw new Error('You are not a member of this room');
        }

        const newMessage = new Message({
          content: message.content.trim(),
          sender: username,
          room: message.room,
          timestamp: new Date()
        });
        
        const savedMessage = await newMessage.save();
        console.log('Message saved:', savedMessage);
        
        // Broadcast to all users in the room
        io.to(message.room).emit('message', {
          _id: savedMessage._id,
          content: savedMessage.content,
          sender: savedMessage.sender,
          room: savedMessage.room,
          timestamp: savedMessage.timestamp
        });

        // Create notification for room members
        const notifications = room.members
          .filter(member => member !== username)
          .map(member => ({
            recipient: member,
            sender: username,
            type: 'message',
            content: `New message from ${username} in ${message.room}`,
            room: message.room
          }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          notifications.forEach(notification => {
            io.to(notification.recipient).emit('notification', notification);
          });
        }

        // Send acknowledgment
        if (callback) {
          callback(null, savedMessage);
        }
      } catch (error) {
        console.error('Error saving message:', error);
        if (callback) {
          callback({ message: error.message });
        } else {
          socket.emit('error', { message: 'Failed to save message: ' + error.message });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (socket.username) {
        User.findOneAndUpdate(
          { username: socket.username },
          { online: false, lastSeen: new Date() }
        ).catch(err => console.error('Error updating user status:', err));

        // Broadcast user's offline status
        io.emit('userStatus', { username: socket.username, online: false });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      if (data.room) {
        socket.to(data.room).emit('typing', {
          username: socket.username,
          isTyping: data.isTyping,
          room: data.room
        });
      }
    });

    // Handle reactions
    socket.on('reaction', async (data) => {
      try {
        const { messageId, reactionType, room } = data;
        
        // Find the message
        const message = await Message.findById(messageId);
        if (!message) {
          throw new Error('Message not found');
        }

        // Add or update reaction
        const reactionIndex = message.reactions.findIndex(
          r => r.user === username && r.type === reactionType
        );

        if (reactionIndex === -1) {
          // Add new reaction
          message.reactions.push({
            type: reactionType,
            user: username,
            timestamp: new Date()
          });
        } else {
          // Remove existing reaction
          message.reactions.splice(reactionIndex, 1);
        }

        await message.save();

        // Broadcast reaction update
        io.to(room).emit('reaction', {
          messageId,
          reactionType,
          username,
          room
        });
      } catch (error) {
        console.error('Error handling reaction:', error);
        socket.emit('error', { message: 'Failed to process reaction' });
      }
    });

  } catch (error) {
    console.error('Socket authentication error:', error);
    socket.emit('error', { message: 'Authentication failed' });
    socket.disconnect();
  }
});

// Message Routes
app.get('/api/messages/:room', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ timestamp: 1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Token verification endpoint
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ username: user.username });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout endpoint
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      user.online = false;
      user.lastSeen = new Date();
      await user.save();
      
      // Notify other users about the logout
      io.emit('userStatus', { username: user.username, online: false });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      type: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready for connections`);
});

module.exports = { app, server, io }; 