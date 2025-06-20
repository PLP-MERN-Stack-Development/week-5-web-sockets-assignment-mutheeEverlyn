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
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar 
              rooms={rooms}
              onRoomSelect={handleRoomSelect}
              onUserSelect={handleUserSelect}
              onCreateRoom={() => setShowCreateRoom(true)}
              selectedRoom={selectedRoom}
            />

            {!selectedUser && !selectedRoom ? (
              <NoChatSelected />
            ) : (
              <ChatContainer 
                selectedUser={selectedUser}
                selectedRoom={selectedRoom}
              />
            )}
          </div>
        </div>
      </div>

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
