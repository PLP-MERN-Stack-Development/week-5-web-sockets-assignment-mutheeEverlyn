import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const TypingIndicator = () => {
  const { typingUsers, selectedUser, selectedRoom } = useChatStore();
  const { authUser } = useAuthStore();

  if (!selectedUser && !selectedRoom) return null;

  const currentId = selectedUser ? selectedUser._id : selectedRoom._id;
  const typingUserIds = typingUsers[currentId] || [];

  // Filter out the current user from typing users
  const otherTypingUsers = typingUserIds.filter(id => id !== authUser._id);

  if (otherTypingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-zinc-400">
      {otherTypingUsers.length === 1 ? (
        <span>Someone is typing...</span>
      ) : (
        <span>Multiple people are typing...</span>
      )}
    </div>
  );
};

export default TypingIndicator; 