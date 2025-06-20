import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import TypingIndicator from "./TypingIndicator";

const REACTIONS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠"
};

const ChatContainer = ({ selectedUser, selectedRoom }) => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessageAsRead,
    addReaction,
    currentPage,
    hasMore,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    } else if (selectedRoom) {
      getMessages(selectedRoom._id, 1, true); // true indicates it's a room
    }
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, selectedRoom?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current || !hasMore || isMessagesLoading) return;

    const { scrollTop } = containerRef.current;
    if (scrollTop === 0) {
      if (selectedUser) {
        getMessages(selectedUser._id, currentPage + 1);
      } else if (selectedRoom) {
        getMessages(selectedRoom._id, currentPage + 1, true);
      }
    }
  };

  const handleReaction = (messageId, reaction) => {
    addReaction(messageId, reaction);
  };

  if (isMessagesLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader selectedUser={selectedUser} selectedRoom={selectedRoom} />
        <MessageSkeleton />
        <MessageInput selectedUser={selectedUser} selectedRoom={selectedRoom} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader selectedUser={selectedUser} selectedRoom={selectedRoom} />
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {messages.map((message) => {
          const isOwnMessage = message.senderId === authUser._id;
          return (
            <div
              key={message._id}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
            >
              <div
                className={`max-w-[70%] ${
                  isOwnMessage ? "bg-primary text-primary-content" : "bg-base-300"
                } rounded-lg p-3`}
              >
                {!isOwnMessage && selectedRoom && (
                  <div className="text-xs font-medium mb-1">
                    {message.sender?.fullName}
                  </div>
                )}
                {message.content && <p>{message.content}</p>}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Shared"
                    className="mt-2 rounded-lg max-w-full"
                  />
                )}
                {message.fileUrl && (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 text-sm"
                  >
                    <span>📎</span>
                    <span>{message.fileName}</span>
                  </a>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-70">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isOwnMessage && (
                    <span className="text-xs opacity-70">
                      {message.readBy.length > 1 ? "Read" : "Delivered"}
                    </span>
                  )}
                </div>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {message.reactions.map((reaction, index) => (
                      <span key={index}>{REACTIONS[reaction.type]}</span>
                    ))}
                  </div>
                )}
              </div>
              {!isOwnMessage && (
                <div className="flex gap-1 ml-2 self-end">
                  {Object.keys(REACTIONS).map((reaction) => (
                    <button
                      key={reaction}
                      onClick={() => handleReaction(message._id, reaction)}
                      className="text-sm hover:scale-110 transition-transform"
                    >
                      {REACTIONS[reaction]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>
      <TypingIndicator />
      <MessageInput selectedUser={selectedUser} selectedRoom={selectedRoom} />
    </div>
  );
};

export default ChatContainer;
