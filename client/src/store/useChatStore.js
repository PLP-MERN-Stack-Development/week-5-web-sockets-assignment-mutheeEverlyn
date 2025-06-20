import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedRoom: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {},
  currentPage: 1,
  hasMore: true,
  searchResults: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (id, page = 1, isRoom = false) => {
    set({ isMessagesLoading: true });
    try {
      const endpoint = isRoom
        ? `/messages/room/${id}`
        : `/messages/private/${id}`;
      const res = await axiosInstance.get(`${endpoint}?page=${page}`);
      if (page === 1) {
        set({ messages: res.data, currentPage: 1 });
      } else {
        set(state => ({ 
          messages: [...state.messages, ...res.data],
          currentPage: page
        }));
      }
      set({ hasMore: res.data.length === 20 }); // Assuming 20 is the page size
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { messages } = get();
    const { recipientId, content, text, image, file, isRoom } = messageData;
    try {
      const endpoint = isRoom
        ? `/messages/room/${recipientId}`
        : `/messages/private/${recipientId}`;
      const payload = { content: content || text, image, file };
      const res = await axiosInstance.post(endpoint, payload);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      await axiosInstance.post(`/messages/read/${messageId}`);
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId
            ? { ...msg, readBy: [...msg.readBy, useAuthStore.getState().authUser._id] }
            : msg
        )
      }));
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  },

  addReaction: async (messageId, reaction) => {
    try {
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, { reaction });
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId ? res.data : msg
        )
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add reaction");
    }
  },

  searchMessages: async (query) => {
    try {
      const res = await axiosInstance.get(`/messages/search?query=${query}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to search messages");
    }
  },

  setTypingUsers: (typingUsers) => set({ typingUsers }),

  subscribeToMessages: () => {
    const { selectedUser, selectedRoom } = get();
    if (!selectedUser && !selectedRoom) return;

    const socket = useAuthStore.getState().socket;
    const currentId = selectedUser ? selectedUser._id : selectedRoom._id;

    socket.on("newMessage", (newMessage) => {
      const isMessageForCurrentChat = 
        (selectedUser && newMessage.senderId === selectedUser._id) ||
        (selectedRoom && newMessage.roomId === selectedRoom._id);
      
      if (!isMessageForCurrentChat) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    socket.on("typingUsers", (typingUsers) => {
      set({ typingUsers });
    });

    socket.on("messageRead", ({ messageId, userId }) => {
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId
            ? { ...msg, readBy: [...msg.readBy, userId] }
            : msg
        )
      }));
    });

    socket.on("messageReaction", ({ messageId, userId, reaction }) => {
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId
            ? {
                ...msg,
                reactions: [
                  ...msg.reactions.filter(r => r.userId !== userId),
                  { userId, type: reaction }
                ]
              }
            : msg
        )
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("typingUsers");
    socket.off("messageRead");
    socket.off("messageReaction");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, selectedRoom: null }),
  setSelectedRoom: (selectedRoom) => set({ selectedRoom, selectedUser: null }),
}));
