import { NextPageContext } from "next";
import { getSession } from "next-auth/react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useRouter } from "next/router";
import { useState, useCallback, useEffect } from "react";
import Input from "@/components/Input";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

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

const Settings = () => {
  const router = useRouter();
  const { data: user, mutate } = useCurrentUser();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await axios.put("/api/user/settings", { name, password });
      toast.success("Settings updated successfully!");
      mutate();
      setPassword(""); // Clear password field after successful update
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  }, [name, password, mutate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="w-full px-4 md:px-12 py-6 flex items-center">
        <button
          onClick={() => router.push("/main")}
          className="flex flex-row items-center gap-2 hover:opacity-80 transition"
        >
          <ArrowLeft size={24} />
          <span className="text-xl font-semibold">Account Settings</span>
        </button>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-8 shadow-lg animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">Profile Details</h2>
          
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Email Address (Read Only)</p>
              <div className="bg-zinc-800 text-zinc-300 px-6 py-4 rounded-md cursor-not-allowed">
                {user?.email}
              </div>
            </div>

            <Input
              id="name"
              label="Name"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
            />

            <div>
              <p className="text-zinc-400 text-sm mb-2 mt-4">Change Password</p>
              <p className="text-xs text-zinc-500 mb-4">
                Leave blank if you don't want to change your password. If you signed up with Google or GitHub, setting a password here will allow you to log in via Email & Password as well.
              </p>
              <Input
                id="password"
                type="password"
                label="New Password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={isLoading}
              className={`w-full mt-6 py-3.5 rounded-md font-semibold text-white flex items-center justify-center gap-2 transition ${
                isLoading ? "bg-red-800/60 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
