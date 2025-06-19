import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Badge,
  Drawer,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Fab,
  Zoom,
  Popover,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachFileIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  Menu as MenuIcon,
  Circle as CircleIcon,
  ThumbUp,
  ThumbUpOutlined,
  Favorite,
  FavoriteBorder,
  Add as AddIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  KeyboardArrowUp as LoadMoreIcon,
  Logout as LogoutIcon,
  ExitToApp as ExitToAppIcon,
  AccountCircle,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState('');
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reactions, setReactions] = useState({});
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [leaveRoomDialogOpen, setLeaveRoomDialogOpen] = useState(false);
  const [onlineUsersOpen, setOnlineUsersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);

  // Memoize notification functions
  const showNotification = useCallback((title, options = {}) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  }, []);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchMessageHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/messages/general', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setMessages(prev => ({
        ...prev,
        general: response.data.reverse()
      }));
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      // Automatically send the file
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !currentRoom || !socket) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room', currentRoom.name);

      const response = await axios.post(`${API_BASE_URL}/messages/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);

      // Emit message through socket
      socket.emit('message', {
        content: `File uploaded: ${file.name}`,
        room: currentRoom.name,
        timestamp: new Date(),
        attachment: response.data
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = (messageId, reactionType) => {
    if (!socket || !currentRoom) return;
    
    socket.emit('reaction', {
      messageId,
      reactionType,
      room: currentRoom.name
    });
  };

  const MessageBubble = ({ message }) => {
    const isOwnMessage = message.sender === user;
    const messageReactions = reactions[message._id] || [];

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          mb: 2,
          maxWidth: '70%',
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
          width: '100%',
        }}
      >
        {!isOwnMessage && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, ml: 1 }}
          >
            {message.sender}
          </Typography>
        )}
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            backgroundColor: isOwnMessage ? 'primary.main' : 'background.paper',
            color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            position: 'relative',
            minWidth: '100px',
            maxWidth: '100%',
          }}
        >
          {message.attachment && (
            <Box sx={{ mb: 1 }}>
              {message.attachment.type.startsWith('image/') ? (
                <img
                  src={`http://localhost:5000${message.attachment.path}`}
                  alt={message.attachment.filename}
                  style={{ maxWidth: '100%', borderRadius: 4 }}
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  href={`http://localhost:5000${message.attachment.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<AttachFileIcon />}
                >
                  {message.attachment.filename}
                </Button>
              )}
            </Box>
          )}
          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              mt: 0.5,
              justifyContent: 'flex-end',
            }}
          >
            {messageReactions.map((reaction, index) => (
              <Typography key={index} variant="caption">
                {reaction.type === 'heart' ? '❤️' : '👍'} {reaction.count}
              </Typography>
            ))}
          </Box>
          {!isOwnMessage && (
            <Box
              sx={{
                position: 'absolute',
                right: -40,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: 0.5,
              }}
            >
              <IconButton
                size="small"
                onClick={() => handleReaction(message._id, 'heart')}
              >
                <FavoriteBorder fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleReaction(message._id, 'thumbsup')}
              >
                <ThumbUpOutlined fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Paper>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 1 }}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </Box>
    );
  };

  const fetchOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/online', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineUsers(response.data);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  // Handle room change
  const handleRoomChange = useCallback((roomName) => {
    setCurrentRoom(roomName);
    setMessages([]);
    if (socket) {
      socket.emit('join', roomName);
    }
  }, [socket]);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to load rooms. Please try again.');
      setLoading(false);
    }
  }, [token]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
      console.log('No token or username found, redirecting to login');
      navigate('/login');
      return;
    }

    setIsAuthenticated(true);
    setUser(username);
  }, [navigate]);

  // Initialize socket connection
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      setError('');
      setSocketConnected(true);
      reconnectAttempts.current = 0;
      fetchRooms();
      fetchOnlineUsers();
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server. Please try again.');
      if (error.message.includes('authentication')) {
        navigate('/login');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setError('Disconnected from server. Attempting to reconnect...');
      setSocketConnected(false);
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Connection error. Please try again.');
    });

    newSocket.on('message', (message) => {
      console.log('Received message:', message);
      if (message.room === currentRoom?.name) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => 
            m._id === message._id || 
            (m.content === message.content && 
             m.sender === message.sender && 
             new Date(m.timestamp).getTime() === new Date(message.timestamp).getTime())
          );
          if (exists) return prev;
          return [...prev, message];
        });
        
        if (message.sender !== user) {
          showNotification(`New message from ${message.sender}`, {
            body: message.content
          });
          playNotificationSound();
        }
      }
    });

    newSocket.on('messageHistory', (history) => {
      console.log('Received message history:', history);
      setMessages(history);
    });

    newSocket.on('typing', (data) => {
      console.log('Typing event:', data);
      if (data.room === currentRoom?.name) {
        setTypingUsers(prev => ({
          ...prev,
          [data.username]: data.isTyping
        }));
      }
    });

    newSocket.on('reaction', (data) => {
      console.log('Reaction event:', data);
      if (data.room === currentRoom?.name) {
        setReactions(prev => ({
          ...prev,
          [data.messageId]: [
            ...(prev[data.messageId] || []),
            { type: data.reactionType, user: data.username }
          ]
        }));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, navigate, currentRoom, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom || !socket) return;

    try {
      // Ensure we have all required data
      if (!currentRoom.name) {
        throw new Error('No room selected');
      }

      const message = {
        content: newMessage.trim(),
        room: currentRoom.name,
        timestamp: new Date().toISOString()
      };

      console.log('Sending message:', message);

      // Clear input immediately for better UX
      setNewMessage('');

      // Emit message through socket
      socket.emit('message', message, (error) => {
        if (error) {
          console.error('Error sending message:', error);
          setError('Failed to send message: ' + error.message);
          // Restore the message in the input if it failed to send
          setNewMessage(message.content);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message: ' + error.message);
      // Restore the message in the input if it failed to send
      setNewMessage(newMessage);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket || !currentRoom) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: currentRoom.name, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { room: currentRoom.name, isTyping: false });
    }, 2000);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
    setEmojiAnchorEl(null);
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Clear all local storage
    localStorage.clear();
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    // Redirect to login
    navigate('/login');
  };

  const toggleDrawer = (open) => (event) => {
    if (
      event &&
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const startPrivateChat = (targetUsername) => {
    if (socket) {
      socket.emit('startPrivateChat', targetUsername);
      const roomId = [user, targetUsername].sort().join('-');
      setCurrentRoom(roomId);
    }
  };

  const handleCreateRoom = async (roomName) => {
    if (!roomName.trim()) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/rooms`, 
        { name: roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRooms(prev => [...prev, response.data]);
      setCurrentRoom(response.data);
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rooms/${roomId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const room = response.data;
      if (room) {
        setCurrentRoom(room);
        setMessages([]);
        setPagination(prev => ({ ...prev, page: 1, hasMore: true }));
        
        // Join the room via socket
        if (socket) {
          socket.emit('join', room.name);
        }
        
        if (isMobile) {
          setDrawerOpen(false);
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/notifications/read', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const RoomDrawer = () => (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={toggleDrawer(false)}
      variant={isMobile ? "temporary" : "permanent"}
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Chat Rooms</Typography>
          <IconButton onClick={() => setCreateRoomOpen(true)}>
            <AddIcon />
          </IconButton>
        </Box>
        <List>
          {rooms.map((room) => (
            <ListItem
              key={room._id}
              button
              selected={currentRoom === room._id}
              onClick={() => handleJoinRoom(room._id)}
            >
              <ListItemAvatar>
                <Avatar>
                  <GroupIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={room.name}
                secondary={room.type === 'private' ? 'Private Room' : 'Public Room'}
              />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Online Users
        </Typography>
        <List>
          {onlineUsers.map((username) => (
            <ListItem
              key={username}
              button
              onClick={() => startPrivateChat(username)}
              disabled={username === user}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  color="success"
                >
                  <Avatar>{username[0].toUpperCase()}</Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={username}
                secondary={username === user ? '(You)' : 'Click to chat'}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  const CreateRoomDialog = () => (
    <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)}>
      <DialogTitle>Create New Room</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Room Name"
          fullWidth
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateRoomOpen(false)}>Cancel</Button>
        <Button onClick={() => handleCreateRoom(newRoomName)} variant="contained">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );

  const NotificationDrawer = () => (
    <Drawer
      anchor="right"
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <Box sx={{ width: 300, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Notifications</Typography>
          <Button onClick={handleMarkNotificationsRead}>Mark all as read</Button>
        </Box>
        <List>
          {notifications.map((notification, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={notification.content}
                secondary={formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                sx={{
                  opacity: notification.read ? 0.7 : 1,
                  fontWeight: notification.read ? 'normal' : 'bold'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || !currentRoom) return;

    setLoadingMore(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/messages/${currentRoom}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: pagination.page + 1,
          limit: pagination.limit
        }
      });

      if (response.data.length > 0) {
        setMessages(prev => [...response.data, ...prev]);
        setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setError('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/messages/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching messages:', error);
      setError('Failed to search messages. Please try again.');
    }
  };

  const SearchBar = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search messages..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSearch(e.target.value);
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: isSearching && (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          )
        }}
      />
    </Box>
  );

  // Initialize chat with first room
  useEffect(() => {
    if (rooms.length > 0 && !currentRoom) {
      handleRoomChange(rooms[0].name);
    }
  }, [rooms, currentRoom]);

  // Fetch rooms on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    }
  }, [isAuthenticated, fetchRooms]);

  const handleLeaveRoom = () => {
    if (currentRoom) {
      // Remove room from user's rooms
      setRooms(rooms.filter(room => room._id !== currentRoom._id));
      // Clear current room
      setCurrentRoom(null);
      // Clear messages
      setMessages([]);
      // Close dialog
      setLeaveRoomDialogOpen(false);
    }
  };

  // Add connection status indicator
  const ConnectionStatus = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        padding: '4px 12px',
        borderRadius: 2,
        boxShadow: 1,
        border: '1px solid',
        borderColor: socketConnected ? 'success.main' : 'error.main',
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: socketConnected ? 'success.main' : 'error.main',
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {socketConnected ? 'Connected' : 'Disconnected'}
      </Typography>
    </Box>
  );

  // Typing indicator component
  const TypingIndicator = () => {
    const typingUsersList = Object.entries(typingUsers)
      .filter(([username, isTyping]) => isTyping && username !== user)
      .map(([username]) => username);

    if (typingUsersList.length === 0) return null;

    return (
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {typingUsersList.length === 1
            ? `${typingUsersList[0]} is typing...`
            : `${typingUsersList.join(', ')} are typing...`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: 'text.secondary',
              animation: 'typing 1s infinite',
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: 'text.secondary',
              animation: 'typing 1s infinite 0.2s',
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: 'text.secondary',
              animation: 'typing 1s infinite 0.4s',
            }}
          />
        </Box>
      </Box>
    );
  };

  // Update the messages display section
  const MessagesList = () => (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        },
        '@keyframes typing': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' },
        },
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message._id} message={message} />
      ))}
      <TypingIndicator />
      <div ref={messagesEndRef} />
    </Box>
  );

  // Update the message input section
  const MessageInput = () => (
    <Box
      component="form"
      onSubmit={handleSendMessage}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'center',
      }}
    >
      <IconButton onClick={() => fileInputRef.current?.click()}>
        <AttachFileIcon />
      </IconButton>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      <IconButton onClick={() => setEmojiAnchorEl(document.getElementById('message-input'))}>
        <EmojiIcon />
      </IconButton>
      <TextField
        id="message-input"
        fullWidth
        variant="outlined"
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => {
          setNewMessage(e.target.value);
          handleTyping();
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
          }
        }}
        multiline
        maxRows={4}
        size="small"
      />
      <IconButton
        color="primary"
        type="submit"
        disabled={!newMessage.trim() && !selectedFile}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {currentRoom ? currentRoom.name : 'Chat App'}
          </Typography>
          
          <Tooltip title="Online Users">
            <IconButton color="inherit" onClick={() => setOnlineUsersOpen(true)}>
              <Badge badgeContent={onlineUsers.length} color="secondary">
                <GroupIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={() => setNotificationsOpen(true)}>
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Search">
            <IconButton color="inherit" onClick={() => setSearchDrawerOpen(true)}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Account">
            <IconButton color="inherit" onClick={handleMenuClick}>
              <AccountCircle />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for AppBar */}
      
      <RoomDrawer />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {currentRoom ? (
          <>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{currentRoom.name}</Typography>
              <IconButton 
                color="error" 
                onClick={() => setLeaveRoomDialogOpen(true)}
                title="Leave Room"
              >
                <ExitToAppIcon />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
              {hasMore && (
                <Button
                  startIcon={<LoadMoreIcon />}
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                  sx={{ alignSelf: 'center', mb: 2 }}
                >
                  {loadingMore ? 'Loading...' : 'Load More Messages'}
                </Button>
              )}
              
              {searchResults.length > 0 ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                    Search Results
                  </Typography>
                  {searchResults.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </>
              ) : (
                messages[currentRoom]?.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              
              {typingUsers[currentRoom]?.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {typingUsers[currentRoom].join(', ')} {typingUsers[currentRoom].length === 1 ? 'is' : 'are'} typing...
                </Typography>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <MessageInput />
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            p: 3,
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Select a room to start chatting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Or create a new room using the sidebar
            </Typography>
          </Box>
        )}
      </Box>

      <CreateRoomDialog />
      <NotificationDrawer />

      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme={theme.palette.mode}
        />
      </Popover>

      {/* Leave Room Confirmation Dialog */}
      <Dialog
        open={leaveRoomDialogOpen}
        onClose={() => setLeaveRoomDialogOpen(false)}
      >
        <DialogTitle>Leave Room</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this room? You can rejoin later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveRoomDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLeaveRoom} color="error">Leave Room</Button>
        </DialogActions>
      </Dialog>

      {/* Online Users Drawer */}
      <Drawer
        anchor="right"
        open={onlineUsersOpen}
        onClose={() => setOnlineUsersOpen(false)}
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Online Users
          </Typography>
          <List>
            {onlineUsers.map((user) => (
              <ListItem key={user}>
                <Chip
                  avatar={<Avatar>{user[0].toUpperCase()}</Avatar>}
                  label={user}
                  color="primary"
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <List>
            {notifications.map((notification, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={notification.content}
                  secondary={formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Search Drawer */}
      <Drawer
        anchor="right"
        open={searchDrawerOpen}
        onClose={() => setSearchDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Search Messages
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            sx={{ mb: 2 }}
          />
          <List>
            {searchResults.map((result) => (
              <ListItem key={result._id} button onClick={() => {
                handleRoomChange(rooms.find(r => r._id === result.room));
                setSearchDrawerOpen(false);
              }}>
                <ListItemText
                  primary={result.content}
                  secondary={`${result.sender} - ${formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Account Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Add connection status indicator */}
      <ConnectionStatus />
    </Box>
  );
};

export default Chat; 