import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Paperclip, Smile } from "lucide-react";
import toast from "react-hot-toast";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const MessageInput = ({ selectedUser, selectedRoom }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();
  const { socket } = useAuthStore();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = () => {
    const roomId = selectedUser ? selectedUser._id : selectedRoom._id;
    socket.emit("typing", { roomId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { roomId, isTyping: false });
    }, 2000);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFilePreview({
      name: file.name,
      type: file.type,
      size: file.size,
      data: file
    });
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: filePreview,
        recipientId: selectedUser ? selectedUser._id : selectedRoom._id,
        isRoom: !!selectedRoom,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 border-t border-base-300">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-50">
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="auto" />
        </div>
      )}
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-base-300 rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {filePreview && (
        <div className="relative mb-2 inline-block bg-base-300 p-2 rounded-lg">
          <span className="text-sm">{filePreview.name}</span>
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 bg-base-300 rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          className="input input-bordered flex-1"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="btn btn-circle">
          <Paperclip className="h-5 w-5" />
        </label>
        <button
          type="button"
          className="btn btn-circle"
          onClick={() => setShowEmojiPicker((v) => !v)}
        >
          <Smile className="h-5 w-5" />
        </button>
        <button type="submit" className="btn btn-circle btn-primary">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
