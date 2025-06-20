import { useState } from "react";

const CreateRoomModal = ({ onClose, onCreateRoom }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateRoom(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create New Room</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Room Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="textarea textarea-bordered w-full"
              rows="3"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="checkbox"
              />
              <span className="text-sm">Private Room</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal; 