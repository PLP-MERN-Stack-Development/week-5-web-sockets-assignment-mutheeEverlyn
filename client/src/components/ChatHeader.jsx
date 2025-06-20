import { X, MessageSquare, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = ({ selectedUser, selectedRoom }) => {
  const { setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const handleClose = () => {
    setSelectedUser(null);
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar/Icon */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {selectedUser ? (
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              ) : (
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="size-6 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-medium">
              {selectedUser ? selectedUser.fullName : selectedRoom?.name}
            </h3>
            {selectedUser ? (
              <p className="text-sm text-base-content/70">
                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
            ) : (
              <p className="text-sm text-base-content/70 flex items-center gap-1">
                <Users className="size-4" />
                {selectedRoom?.members.length} members
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button onClick={handleClose}>
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
