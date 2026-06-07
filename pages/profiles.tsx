import { NextPageContext } from "next";
import { getSession } from "next-auth/react";
import useCurrentUser from "@/hooks/useCurrentUser";
import useProfiles from "@/hooks/useProfiles";
import { useRouter } from "next/router";
import Image from "next/image";
import React, { useState, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Camera, Loader2, Check, X, ArrowLeft } from "lucide-react";

export async function getServerSideProps(context: NextPageContext) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sasha",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Cookie",
  "/images/default-blue.png",
];

const Profiles = () => {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: profiles, mutate } = useProfiles();

  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSelect = (profile: any) => {
    if (isEditMode) {
      // Open Edit Modal
      setEditingProfile(profile);
      setProfileName(profile.name);
      setProfileImage(profile.image || "/images/default-blue.png");
    } else {
      // Set active profile cookie (lasts 1 year)
      document.cookie = `chillflix_profile_id=${profile.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      window.location.href = "/main";
    }
  };

  const openAddModal = () => {
    if (profiles && profiles.length >= 5) {
      toast.error("Maximum of 5 profiles allowed");
      return;
    }
    setProfileName("");
    setProfileImage(DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]);
    setShowAddModal(true);
  };

  // 2-step direct avatar upload to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP or GIF files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be under 2 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const { data: signData } = await axios.get(`/api/user/avatar?ext=${ext}`);
      const { signedUrl, publicUrl } = signData;

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "true" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Direct storage upload failed");
      }

      setProfileImage(publicUrl);
      toast.success("Avatar uploaded!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setUploading(true);
      await axios.post("/api/user/profiles", {
        name: profileName.trim(),
        image: profileImage,
      });

      toast.success("Profile created!");
      mutate();
      setShowAddModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create profile");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setUploading(true);
      await axios.put(`/api/user/profiles/${editingProfile.id}`, {
        name: profileName.trim(),
        image: profileImage,
      });

      toast.success("Profile updated!");
      mutate();
      setEditingProfile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm(`Are you sure you want to delete profile "${editingProfile.name}"?`)) {
      return;
    }

    try {
      setUploading(true);
      await axios.delete(`/api/user/profiles/${editingProfile.id}`);
      toast.success("Profile deleted");
      
      // If we deleted the active profile, clear the active cookie
      const cookies = document.cookie.split(";");
      const activeCookie = cookies.find(c => c.trim().startsWith("chillflix_profile_id="));
      if (activeCookie && activeCookie.split("=")[1] === editingProfile.id) {
        document.cookie = "chillflix_profile_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }

      mutate();
      setEditingProfile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete profile");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] text-white px-4 py-10 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center max-w-5xl w-full z-10">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-center transition-all duration-300">
          {isEditMode ? "Manage Profiles" : "Who is watching?"}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-12 sm:mt-16">
          {profiles?.map((profile: any) => (
            <div
              key={profile.id}
              onClick={() => handleProfileSelect(profile)}
              className="group flex flex-col items-center cursor-pointer w-32 sm:w-40"
            >
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:border-white shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                <Image
                  src={profile.image || "/images/default-blue.png"}
                  alt={profile.name}
                  fill
                  sizes="(max-width: 640px) 128px, 160px"
                  className="object-cover"
                  unoptimized={!!profile.image}
                />
                {isEditMode && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity">
                    <div className="bg-black/50 border border-white/20 p-2 rounded-full text-white hover:scale-110 transition-transform">
                      <Edit2 size={20} />
                    </div>
                  </div>
                )}
              </div>
              <span className="mt-4 text-zinc-400 text-base sm:text-xl text-center font-medium truncate w-full group-hover:text-white transition-colors">
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Card */}
          {!isEditMode && (profiles?.length || 0) < 5 && (
            <button
              onClick={openAddModal}
              className="group flex flex-col items-center w-32 sm:w-40 outline-none"
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-400 hover:bg-zinc-900/40 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-white shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <Plus size={40} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <span className="mt-4 text-zinc-500 text-base sm:text-xl text-center font-medium group-hover:text-white transition-colors">
                Add Profile
              </span>
            </button>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-16 flex gap-4">
          {isEditMode ? (
            <button
              onClick={() => setIsEditMode(false)}
              className="px-6 py-2.5 rounded border border-white bg-white text-black font-semibold hover:bg-zinc-200 transition text-sm tracking-wider uppercase"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditMode(true)}
                className="px-6 py-2.5 rounded border border-zinc-600 text-zinc-400 font-semibold hover:border-white hover:text-white transition text-sm tracking-wider uppercase"
              >
                Manage Profiles
              </button>
              {router.query.back === "true" && (
                <button
                  onClick={() => router.push("/main")}
                  className="px-6 py-2.5 rounded bg-zinc-900 text-zinc-300 font-semibold hover:bg-zinc-800 transition text-sm flex items-center gap-1"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Profile Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-slide-down">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Add Profile</h2>
            <p className="text-xs text-zinc-500 mb-6">Add a profile for another person watching ChillFlix.</p>

            <div className="space-y-6">
              {/* Profile Avatar Select */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden ring-2 ring-white/10 mb-4 shadow-inner">
                  <Image
                    src={profileImage}
                    alt="avatar-preview"
                    fill
                    className="object-cover"
                    unoptimized={profileImage.startsWith("http")}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Camera size={18} className="text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Templates list */}
                <div className="flex gap-2.5 overflow-x-auto py-1 max-w-full no-scrollbar">
                  {DEFAULT_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      onClick={() => setProfileImage(avatar)}
                      className={`relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 transition-transform ${profileImage === avatar ? "ring-2 ring-red-600 scale-105" : "opacity-60 hover:opacity-100"}`}
                    >
                      <Image src={avatar} alt="avatar-template" fill className="object-cover" unoptimized={avatar.startsWith("http")} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Input field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter name"
                  maxLength={15}
                  disabled={uploading}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateProfile}
                  disabled={uploading || !profileName.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={uploading}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ───────────────────────────────────────────────── */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-slide-down">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => handleDeleteProfile()}
                disabled={uploading || (profiles?.length || 0) <= 1}
                className="text-zinc-500 hover:text-red-400 p-1.5 hover:bg-white/5 rounded-lg transition disabled:opacity-40"
                title="Delete Profile"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Modify the name or avatar image for this profile.</p>

            <div className="space-y-6">
              {/* Profile Avatar Select */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden ring-2 ring-white/10 mb-4 shadow-inner">
                  <Image
                    src={profileImage}
                    alt="avatar-preview"
                    fill
                    className="object-cover"
                    unoptimized={profileImage.startsWith("http")}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Camera size={18} className="text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Templates list */}
                <div className="flex gap-2.5 overflow-x-auto py-1 max-w-full no-scrollbar">
                  {DEFAULT_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      onClick={() => setProfileImage(avatar)}
                      className={`relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 transition-transform ${profileImage === avatar ? "ring-2 ring-red-600 scale-105" : "opacity-60 hover:opacity-100"}`}
                    >
                      <Image src={avatar} alt="avatar-template" fill className="object-cover" unoptimized={avatar.startsWith("http")} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Input field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter name"
                  maxLength={15}
                  disabled={uploading}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateProfile}
                  disabled={uploading || !profileName.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save
                </button>
                <button
                  onClick={() => setEditingProfile(null)}
                  disabled={uploading}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profiles;

