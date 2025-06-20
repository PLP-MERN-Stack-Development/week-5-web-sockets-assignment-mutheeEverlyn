[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19767741&assignment_repo_type=AssignmentRepo)
# Real-Time Chat Application

A modern real-time chat application built with React, Node.js, Express, and Socket.io. This application demonstrates bidirectional communication between clients and server, implementing features like live messaging, notifications, and online status updates.

## Features

### Core Features
- Real-time messaging using Socket.io
- User authentication (JWT-based)
- Global chat room
- Message timestamps
- Typing indicators
- Online/offline status
- File sharing
- Message reactions
- Read receipts

### Advanced Features
- Private messaging
- Multiple chat rooms
- Real-time notifications
- Browser notifications
- Message pagination
- Reconnection handling
- Message search
- Responsive design

## Tech Stack

### Frontend
- React
- Material-UI
- Socket.io Client
- React Router
- Axios
- Date-fns

### Backend
- Node.js
- Express
- Socket.io
- MongoDB
- JWT
- Bcrypt

## Prerequisites

- Node.js (v18+)
- MongoDB
- npm or yarn

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/PLP-MERN-Stack-Development/week-5-web-sockets-assignment-mutheeEverlyn.git
cd week-5-web-sockets-assignment-mutheeEverlyn
```

2. Run the setup script to configure environment variables:
```bash
node setup.js
```

3. Install server dependencies:
```bash
cd server
pnpm install
```

4. Install client dependencies:
```bash
cd client
pnpm install
```

5. Start the development servers:

In the server directory:
```bash
pnpm run dev
```

In the client directory:
```bash
pnpm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Manual Environment Setup

If you prefer to set up the environment variables manually:

1. Create a `.env` file in the server directory with:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

## Usage

1. Register a new account or login with existing credentials
2. Join the global chat room
3. Start sending messages
4. Use the sidebar to see online users
5. Click on a user to start a private chat
6. Use the file attachment button to share files
7. React to messages using the reaction feature

## Features in Detail

### Authentication
- Secure JWT-based authentication
- Password hashing with bcrypt
- Protected routes
- Session management

### Real-time Communication
- Instant message delivery
- Typing indicators
- Online/offline status updates
- Read receipts
- Message reactions

### User Experience
- Responsive design for all devices
- Modern Material-UI interface
- Real-time notifications
- File sharing capabilities
- Message search functionality

### Performance
- Message pagination
- Optimized Socket.io connections
- Efficient reconnection handling
- Browser notifications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Socket.io for real-time communication
- Material-UI for the beautiful components
- MongoDB for the database
- React team for the amazing framework 