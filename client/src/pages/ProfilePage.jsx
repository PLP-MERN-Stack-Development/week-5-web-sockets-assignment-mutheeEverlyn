import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";
import { toast } from "react-hot-toast";

const MAX_IMAGE_SIZE_MB = 2;

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(`Image must be less than ${MAX_IMAGE_SIZE_MB}MB.`);
      toast.error(`Image must be less than ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setSelectedImg(reader.result);
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      toast.error("Failed to read image file.");
    };
  };

  const handleRemoveImage = () => {
    setSelectedImg(null);
    setError("");
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const updateData = {};
    if (fullName && fullName !== authUser.fullName) updateData.fullName = fullName;
    if (email && email !== authUser.email) updateData.email = email;
    if (selectedImg) updateData.profilePic = selectedImg;
    if (Object.keys(updateData).length === 0) {
      setError("No changes to save.");
      setSaving(false);
      return;
    }
    try {
      await updateProfile(updateData);
      setSelectedImg(null);
      toast.success("Profile updated!");
    } catch (err) {
      setError("Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
              {selectedImg && !isUpdatingProfile && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-0 left-0 bg-red-500 text-white rounded-full p-1 text-xs"
                  title="Remove selected image"
                >
                  ✕
                </button>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <input
                type="text"
                className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={isUpdatingProfile || saving}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <input
                type="email"
                className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isUpdatingProfile || saving}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isUpdatingProfile || saving}
            >
              {isUpdatingProfile || saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
