import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MessageSquare, Plus } from "lucide-react";

const Sidebar = ({ rooms = [], onRoomSelect, onUserSelect, onCreateRoom, isLoadingRooms, selectedRoom }) => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "rooms"

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 mt-16">
      {/* Tabs */}
      <div className="flex border-b border-base-300">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 p-3 flex items-center justify-center gap-2 ${
            activeTab === "users" ? "bg-base-300" : ""
          }`}
        >
          <Users className="size-5" />
          <span className="hidden lg:block">Users</span>
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex-1 p-3 flex items-center justify-center gap-2 ${
            activeTab === "rooms" ? "bg-base-300" : ""
          }`}
        >
          <MessageSquare className="size-5" />
          <span className="hidden lg:block">Rooms</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "users" ? (
          <>
            <div className="p-3 border-b border-base-300">
              <div className="hidden lg:flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnlineOnly}
                    onChange={(e) => setShowOnlineOnly(e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">Show online only</span>
                </label>
                <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
              </div>
            </div>

            <div className="py-2">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    onUserSelect(user);
                  }}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.name}
                      className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                        rounded-full ring-2 ring-zinc-900"
                      />
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-zinc-400">
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4">No online users</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 border-b border-base-300">
              <button
                onClick={onCreateRoom}
                className="w-full btn btn-primary btn-sm flex items-center justify-center gap-2"
              >
                <Plus className="size-4" />
                <span className="hidden lg:block">Create Room</span>
              </button>
            </div>

            <div className="py-2">
              {isLoadingRooms ? (
                <div className="text-center text-zinc-500 py-4">Loading rooms...</div>
              ) : Array.isArray(rooms) && rooms.length > 0 ? (
                rooms.map((room) => (
                  <button
                    key={room._id}
                    onClick={() => onRoomSelect(room)}
                    className={`
                      w-full p-3 flex items-center gap-3
                      hover:bg-base-300 transition-colors
                      ${selectedRoom?._id === room._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                    `}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="size-6 text-primary" />
                      </div>
                    </div>

                    <div className="hidden lg:block text-left min-w-0">
                      <div className="font-medium truncate">{room.name}</div>
                      <div className="text-sm text-zinc-400">
                        {room.members?.length || 0} members
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center text-zinc-500 py-4">No rooms available</div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
