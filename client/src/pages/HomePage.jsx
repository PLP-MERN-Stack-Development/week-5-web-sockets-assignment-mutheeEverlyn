import { useChatStore } from "../store/useChatStore";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { toast } from "react-hot-toast";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import CreateRoomModal from "../components/CreateRoomModal";

const HomePage = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { authUser } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    // Debug log: show current authUser and token
    if (import.meta.env.MODE === "development") {
      const authUserLS = JSON.parse(localStorage.getItem("authUser"));
      console.log("authUser from store:", authUser);
      console.log("authUser from localStorage:", authUserLS);
      if (authUserLS?.token) {
        console.log("Token in localStorage:", authUserLS.token);
      } else {
        console.warn("No token in localStorage");
      }
    }
    const fetchRooms = async () => {
      try {
        const res = await axiosInstance.get("/rooms");
        setRooms(res.data);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast.error("Failed to fetch rooms");
      }
    };

    if (authUser) {
      fetchRooms();
    }
  }, [authUser]);

  const handleCreateRoom = async (roomData) => {
    try {
      const roomWithMembers = {
        ...roomData,
        members: [authUser._id], // Include the creator in the members list
      };
      const res = await axiosInstance.post("/rooms", roomWithMembers);
      // Update rooms state by replacing the entire array with the new data from the server
      const updatedRooms = await axiosInstance.get("/rooms");
      setRooms(updatedRooms.data);
      setShowCreateRoom(false);
      toast.success("Room created successfully!");
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
    }
  };

  const handleRoomSelect = async (room) => {
    try {
      await axiosInstance.post(`/rooms/${room._id}/join`);
      setSelectedRoom(room);
      setSelectedUser(null); // Clear selected user when selecting a room
    } catch (error) {
      console.error("Failed to join room:", error);
      toast.error("Failed to join room");
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedRoom(null); // Clear selected room when selecting a user
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {authUser ? (
        <div className="flex flex-1 h-[calc(100vh-4rem)] min-w-0">
          <Sidebar
            rooms={rooms}
            onRoomSelect={handleRoomSelect}
            onUserSelect={handleUserSelect}
            onCreateRoom={() => setShowCreateRoom(true)}
            isLoadingRooms={false}
            selectedRoom={selectedRoom}
          />
          <div className="flex-1 min-w-0 flex">
            {selectedUser || selectedRoom ? (
              <ChatContainer selectedUser={selectedUser} selectedRoom={selectedRoom} />
            ) : (
              <NoChatSelected />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Not authenticated: show a message or redirect */}
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-bold mb-4">You are not logged in</h2>
            <p className="mb-4">Please log in to access the chat features.</p>
            {/* Optionally, add a login button or redirect here */}
          </div>
          {/* Always-visible Hero Section */}
          <header className="w-full bg-primary text-primary-content py-24 px-4 text-center shadow-md">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to LiveChat 🚀</h1>
            <p className="max-w-2xl mx-auto text-base md:text-lg opacity-90">
              LiveChat is a real-time chat application where you can join rooms, chat with friends, send private messages, share files, and enjoy emoji-powered conversations. Experience seamless, responsive, and modern chat on any device!
            </p>
          </header>

          {/* Features Section */}
          <section className="w-full py-8 px-4 bg-base-100 border-b border-base-300">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-4 rounded-lg shadow bg-base-200">
                <h2 className="text-xl font-semibold mb-2">💬 Real-Time Messaging</h2>
                <p className="text-base-content/70">Send and receive messages instantly in rooms or private chats.</p>
              </div>
              <div className="p-4 rounded-lg shadow bg-base-200">
                <h2 className="text-xl font-semibold mb-2">📁 File & Emoji Sharing</h2>
                <p className="text-base-content/70">Share files, images, and express yourself with emojis in every conversation.</p>
              </div>
              <div className="p-4 rounded-lg shadow bg-base-200">
                <h2 className="text-xl font-semibold mb-2">🔔 Notifications & Status</h2>
                <p className="text-base-content/70">Get notified of new messages, see who is online, and enjoy a modern chat experience.</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="w-full bg-base-300 text-base-content py-4 text-center mt-8 border-t border-base-200">
            <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 px-4">
              <span className="text-sm">&copy; {new Date().getFullYear()} Chatty. All rights reserved.</span>
              <span className="text-xs opacity-70">Built for the Web Sockets Assignment | Powered by React, Node.js, and Socket.io</span>
            </div>
          </footer>
        </>
      )}
      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onCreateRoom={handleCreateRoom}
        />
      )}
    </div>
  );
};

export default HomePage;
