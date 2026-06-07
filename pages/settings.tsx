import { NextPageContext } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useRouter } from "next/router";
import { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowLeft, Loader2, User, Shield, Play, Bell, EyeOff,
  Trash2, ChevronRight, Camera, Check, X, AlertTriangle,
  Globe, Monitor, Lock, LogOut, ExternalLink,
} from "lucide-react";

export async function getServerSideProps(context: NextPageContext) {
  const session = await getServerSession(
    context.req as any,
    context.res as any,
    authOptions
  );
  if (!session) {
    return { redirect: { destination: "/auth", permanent: false } };
  }
  return { props: {} };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "profile" | "security" | "playback" | "notifications" | "privacy";

interface Prefs {
  playback: { autoplay: boolean; autoPreview: boolean; quality: string; audioLang: string; subtitleLang: string };
  notifications: { emailUpdates: boolean; newReleases: boolean; recommendations: boolean; accountAlerts: boolean };
  privacy: { viewingHistory: boolean; dataPersonalization: boolean; marketingEmails: boolean };
}

const DEFAULT_PREFS: Prefs = {
  playback: { autoplay: true, autoPreview: true, quality: "auto", audioLang: "en", subtitleLang: "off" },
  notifications: { emailUpdates: true, newReleases: true, recommendations: false, accountAlerts: true },
  privacy: { viewingHistory: true, dataPersonalization: true, marketingEmails: false },
};

// ─── Small Reusable Components ────────────────────────────────────────────────

const Toggle: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({ id, checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
    <div className="flex-1 pr-8">
      <label htmlFor={id} className="text-sm font-medium text-white cursor-pointer">{label}</label>
      {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
    </div>
    <button
      id={id} role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-red-600" : "bg-zinc-700"}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  </div>
);

const Select: React.FC<{ id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ id, label, value, options, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-white/[0.06] last:border-0 gap-2">
    <label htmlFor={id} className="text-sm font-medium text-white">{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/50 cursor-pointer min-w-[160px] transition">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 mb-4 hover:border-white/10 transition-all duration-200">
    <div className="mb-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

const FieldInput: React.FC<{ id: string; label: string; value: string; onChange?: (v: string) => void; type?: string; readOnly?: boolean; placeholder?: string; hint?: string }> = ({ id, label, value, onChange, type = "text", readOnly, placeholder, hint }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">{label}</label>
    <input id={id} type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly} placeholder={placeholder}
      className={`w-full rounded-lg px-4 py-2.5 text-sm text-white bg-zinc-800 border transition focus:outline-none focus:ring-2 focus:ring-red-600/40 focus:border-red-600/50 ${readOnly ? "border-white/[0.04] text-zinc-400 cursor-not-allowed" : "border-white/[0.08] hover:border-white/20"}`}
    />
    {hint && <p className="text-xs text-zinc-600 mt-1.5">{hint}</p>}
  </div>
);

const SaveBtn: React.FC<{ onClick: () => void; loading: boolean; disabled?: boolean; label?: string; loadingLabel?: string }> = ({ onClick, loading, disabled, label = "Save Changes", loadingLabel = "Saving…" }) => (
  <div className="flex justify-end mt-2">
    <button onClick={onClick} disabled={loading || disabled}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      {loading ? loadingLabel : label}
    </button>
  </div>
);

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "profile",       label: "Profile",        icon: <User size={16} /> },
  { id: "security",      label: "Security",       icon: <Shield size={16} /> },
  { id: "playback",      label: "Playback",       icon: <Play size={16} /> },
  { id: "notifications", label: "Notifications",  icon: <Bell size={16} /> },
  { id: "privacy",       label: "Privacy & Data", icon: <EyeOff size={16} /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const Settings = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: user, mutate } = useCurrentUser();

  const [activeSection, setActiveSection]   = useState<Section>("profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName]                     = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // ── Security state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSecLoading, setIsSecLoading]       = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<{ provider: string; providerAccountId: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]         = useState("");
  const [isDeleting, setIsDeleting]           = useState(false);
  const [isSigningOut, setIsSigningOut]       = useState(false);

  // ── Avatar state ───────────────────────────────────────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSrc, setAvatarSrc]             = useState(""); // local copy — updates instantly
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Preferences state ──────────────────────────────────────────────────────
  const [prefs, setPrefs]               = useState<Prefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(false);

  // ── Load user name & preferences from API ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    // Sync local avatar src from DB whenever user data refreshes
    if (user.image) setAvatarSrc(user.image);

    // Fetch full settings (includes preferences)
    axios.get("/api/user/settings").then(({ data }) => {
      if (data.preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      }
    }).catch(() => {/* silently ignore */});
  }, [user]);

  // ── Load connected OAuth accounts when Security tab opens ─────────────────
  useEffect(() => {
    if (activeSection !== "security") return;
    setAccountsLoading(true);
    axios.get("/api/user/accounts")
      .then(({ data }) => setConnectedAccounts(data))
      .catch(() => setConnectedAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, [activeSection]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const uploadAvatar = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAvatarUploading(true);
    try {
      // Step 1 — ask the server for a signed upload URL (no file data sent to server)
      const ext = file.name.split(".").pop() || "jpg";
      const { data: signData } = await axios.get(`/api/user/avatar?ext=${ext}`);
      const { signedUrl, publicUrl } = signData;

      // Step 2 — browser uploads the file DIRECTLY to Supabase Storage
      // (completely bypasses the Next.js server — no more timeout)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "true" },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Storage upload failed: ${text}`);
      }

      // Step 3 — tell the server to save the public URL in the DB
      await axios.put("/api/user/avatar", { imageUrl: publicUrl });

      toast.success("Avatar updated!");
      // Instantly update the local avatar preview — no round-trip needed
      setAvatarSrc(publicUrl);
      // Also patch the SWR cache so other components (e.g. Navbar) update
      mutate({ ...user, image: publicUrl }, { revalidate: false });
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }, [mutate, user]);

  const saveProfile = useCallback(async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setIsProfileLoading(true);
    try {
      await axios.put("/api/user/settings", { name: name.trim() });
      toast.success("Profile updated!");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setIsProfileLoading(false);
    }
  }, [name, mutate]);

  const savePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setIsSecLoading(true);
    try {
      await axios.put("/api/user/settings", { password: newPassword });
      toast.success("Password updated!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update password");
    } finally {
      setIsSecLoading(false);
    }
  }, [newPassword, confirmPassword]);

  const disconnectProvider = useCallback(async (provider: string) => {
    try {
      await axios.delete("/api/user/accounts", { data: { provider } });
      toast.success(`${provider} disconnected`);
      setConnectedAccounts((prev) => prev.filter((a) => a.provider !== provider));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to disconnect");
    }
  }, []);

  const signOutAllOthers = useCallback(async () => {
    setIsSigningOut(true);
    try {
      // JWT strategy — sessions table is used by the adapter
      await axios.delete("/api/user/sessions", { data: {} });
      toast.success("All other devices signed out");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to sign out other devices");
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      await axios.delete("/api/user/settings");
      toast.success("Account deleted. Goodbye!");
      await signOut({ callbackUrl: "/" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete account");
      setIsDeleting(false);
    }
  }, [deleteInput]);

  const savePrefs = useCallback(async (section: "playback" | "notifications" | "privacy") => {
    setPrefsLoading(true);
    try {
      await axios.put("/api/user/settings", { preferences: { [section]: prefs[section] } });
      toast.success("Preferences saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save preferences");
    } finally {
      setPrefsLoading(false);
    }
  }, [prefs]);

  const clearFavourites = useCallback(async () => {
    try {
      await axios.put("/api/user/settings", { clearFavourites: true });
      toast.success("Viewing history cleared");
      mutate();
    } catch {
      toast.error("Failed to clear history");
    }
  }, [mutate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Section renderers
  // ─────────────────────────────────────────────────────────────────────────

  const renderProfile = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Profile</h2>
        <p className="text-sm text-zinc-500 mt-1">Manage your personal information.</p>
      </div>

      <SectionCard title="Avatar" description="Your profile picture shown across ChillFlix">
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          className="hidden" onChange={uploadAvatar} id="avatar-file-input" />
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-white/10 group-hover:ring-red-600/50 transition-all duration-300">
              <Image
                key={avatarSrc || "default"}  // forces remount on URL change
                src={avatarSrc || "/images/default-blue.png"}
                alt="Avatar"
                width={80} height={80}
                className="object-cover w-full h-full"
                unoptimized={!!avatarSrc}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity">
              {avatarUploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name || "User"}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
            <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
              className="mt-2 text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 font-medium disabled:opacity-50">
              {avatarUploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><Camera size={12} /> Change avatar</>}
            </button>
            <p className="text-xs text-zinc-600 mt-1">Max 2 MB · JPG, PNG, WebP, GIF</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Personal Information" description="Update your display name">
        <FieldInput id="email" label="Email Address" value={user?.email || ""} readOnly
          hint="Email cannot be changed. It is used for login." />
        <FieldInput id="name" label="Display Name" value={name} onChange={setName} placeholder="Your name" />
        <SaveBtn onClick={saveProfile} loading={isProfileLoading} />
      </SectionCard>

      <SectionCard title="Membership" description="Your current plan">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Play size={16} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Premium Plan</p>
              <p className="text-xs text-zinc-500">4K Ultra HD · Dolby Atmos</p>
            </div>
          </div>
          <button className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
            Manage <ExternalLink size={11} />
          </button>
        </div>
      </SectionCard>
    </div>
  );

  const renderSecurity = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Security</h2>
        <p className="text-sm text-zinc-500 mt-1">Manage your password and account access.</p>
      </div>

      <SectionCard
        title="Change Password"
        description={user?.hashedPassword ? "Update your password" : "You signed in with Google/GitHub — setting a password lets you log in with email too"}
      >
        {user?.hashedPassword && (
          <FieldInput id="current-password" label="Current Password" type="password"
            value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" />
        )}
        <FieldInput id="new-password" label="New Password" type="password"
          value={newPassword} onChange={setNewPassword} placeholder="Min. 8 characters" />
        <FieldInput id="confirm-password" label="Confirm New Password" type="password"
          value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter new password" />

        {newPassword.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-1 mb-1">
              {[1,2,3,4].map((i) => {
                const s = Math.min(4, Math.floor(newPassword.length / 3));
                return <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= s ? s <= 1 ? "bg-red-500" : s <= 2 ? "bg-amber-500" : s <= 3 ? "bg-yellow-400" : "bg-emerald-500" : "bg-zinc-700"}`} />;
              })}
            </div>
            <p className="text-xs text-zinc-500">
              {newPassword.length < 8 ? "Too short" : newPassword.length < 10 ? "Weak" : newPassword.length < 13 ? "Moderate" : "Strong"}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={savePassword} disabled={isSecLoading || !newPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all">
            {isSecLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {isSecLoading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Connected Accounts" description="OAuth providers linked to your account">
        {accountsLoading ? (
          <div className="flex items-center gap-2 py-3 text-zinc-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {(["google", "github"] as const).map((p) => {
              const isConnected = connectedAccounts.some((a) => a.provider === p);
              const label = p === "google" ? "Google" : "GitHub";
              const iconColor = p === "google" ? "bg-white text-zinc-900" : "bg-zinc-700 text-white";
              const iconText = p === "google" ? "G" : "GH";
              return (
                <div key={p} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center text-xs font-bold`}>{iconText}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-zinc-500">{isConnected ? "Connected" : "Not connected"}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <button onClick={() => disconnectProvider(p)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:border-red-600/50 hover:text-red-400 transition font-medium">
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={() => window.location.href = `/api/auth/signin/${p}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-600/50 text-red-400 hover:bg-red-600/10 transition font-medium">
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices signed in to your account">
        <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-zinc-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                This device
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">Active now</span>
              </p>
              <p className="text-xs text-zinc-500">Current session</p>
            </div>
          </div>
        </div>
        <button onClick={signOutAllOthers} disabled={isSigningOut}
          className="mt-3 text-xs text-red-400 hover:text-red-300 font-medium transition flex items-center gap-1 disabled:opacity-50">
          {isSigningOut ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
          {isSigningOut ? "Signing out…" : "Sign out of all other devices"}
        </button>
      </SectionCard>

      {/* Danger Zone */}
      <div className="bg-red-950/20 border border-red-600/20 rounded-xl p-6 mt-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-white">Danger Zone</h3>
            <p className="text-xs text-zinc-500 mt-1">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
        </div>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-600/40 text-red-400 hover:bg-red-600/10 text-sm font-medium transition">
            <Trash2 size={14} /> Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:</p>
            <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full max-w-xs bg-zinc-800 border border-red-600/40 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/40" />
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={deleteInput !== "DELETE" || isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition">
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? "Deleting…" : "Permanently Delete"}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm font-medium transition">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPlayback = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Playback & Display</h2>
        <p className="text-sm text-zinc-500 mt-1">Control how content plays on your device.</p>
      </div>

      <SectionCard title="Autoplay" description="Control automatic content playback">
        <Toggle id="autoplay-next" checked={prefs.playback.autoplay}
          onChange={(v) => setPrefs((p) => ({ ...p, playback: { ...p.playback, autoplay: v } }))}
          label="Autoplay next episode" description="Automatically play the next episode in a series" />
        <Toggle id="autoplay-preview" checked={prefs.playback.autoPreview}
          onChange={(v) => setPrefs((p) => ({ ...p, playback: { ...p.playback, autoPreview: v } }))}
          label="Autoplay previews" description="Automatically play previews while browsing" />
      </SectionCard>

      <SectionCard title="Video Quality" description="Streaming quality">
        <Select id="video-quality" label="Default quality" value={prefs.playback.quality}
          onChange={(v) => setPrefs((p) => ({ ...p, playback: { ...p.playback, quality: v } }))}
          options={[{ value: "auto", label: "Auto (Recommended)" }, { value: "4k", label: "4K Ultra HD" }, { value: "1080p", label: "1080p Full HD" }, { value: "720p", label: "720p HD" }, { value: "480p", label: "480p" }]}
        />
        <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">Higher quality uses more data. Consider 720p on mobile.</p>
        </div>
      </SectionCard>

      <SectionCard title="Audio & Subtitles">
        <Select id="audio-lang" label="Audio language" value={prefs.playback.audioLang}
          onChange={(v) => setPrefs((p) => ({ ...p, playback: { ...p.playback, audioLang: v } }))}
          options={[{ value: "en", label: "English" }, { value: "hi", label: "Hindi" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }, { value: "de", label: "German" }, { value: "ja", label: "Japanese" }, { value: "ko", label: "Korean" }]}
        />
        <Select id="subtitle-lang" label="Subtitle language" value={prefs.playback.subtitleLang}
          onChange={(v) => setPrefs((p) => ({ ...p, playback: { ...p.playback, subtitleLang: v } }))}
          options={[{ value: "off", label: "Off" }, { value: "en", label: "English" }, { value: "hi", label: "Hindi" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }]}
        />
      </SectionCard>

      <SaveBtn onClick={() => savePrefs("playback")} loading={prefsLoading} label="Save Preferences" loadingLabel="Saving…" />
    </div>
  );

  const renderNotifications = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Notifications</h2>
        <p className="text-sm text-zinc-500 mt-1">Choose what updates you receive.</p>
      </div>

      <SectionCard title="Email Notifications" description="Emails sent to your registered address">
        <Toggle id="notif-updates" checked={prefs.notifications.emailUpdates}
          onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, emailUpdates: v } }))}
          label="Product updates" description="News about ChillFlix features and improvements" />
        <Toggle id="notif-releases" checked={prefs.notifications.newReleases}
          onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, newReleases: v } }))}
          label="New releases" description="Be first to know when new movies and shows drop" />
        <Toggle id="notif-recommendations" checked={prefs.notifications.recommendations}
          onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, recommendations: v } }))}
          label="Personalized recommendations" description="Content picks based on your watch history" />
        <Toggle id="notif-account" checked={prefs.notifications.accountAlerts}
          onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, accountAlerts: v } }))}
          label="Account & security alerts" description="Important notices about login activity and billing" />
      </SectionCard>

      <SaveBtn onClick={() => savePrefs("notifications")} loading={prefsLoading} label="Save Preferences" />
    </div>
  );

  const renderPrivacy = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Privacy & Data</h2>
        <p className="text-sm text-zinc-500 mt-1">Control how your data is used and stored.</p>
      </div>

      <SectionCard title="Data Usage" description="How ChillFlix uses your activity data">
        <Toggle id="privacy-history" checked={prefs.privacy.viewingHistory}
          onChange={(v) => setPrefs((p) => ({ ...p, privacy: { ...p.privacy, viewingHistory: v } }))}
          label="Save viewing history" description="Lets us remember where you left off and improve recommendations" />
        <Toggle id="privacy-personalization" checked={prefs.privacy.dataPersonalization}
          onChange={(v) => setPrefs((p) => ({ ...p, privacy: { ...p.privacy, dataPersonalization: v } }))}
          label="Personalization" description="Use your activity to personalise content" />
        <Toggle id="privacy-marketing" checked={prefs.privacy.marketingEmails}
          onChange={(v) => setPrefs((p) => ({ ...p, privacy: { ...p.privacy, marketingEmails: v } }))}
          label="Marketing communications" description="Receive promotional emails and special offers" />
      </SectionCard>

      <SectionCard title="Your Data" description="Access and manage your personal data">
        {[
          { label: "Clear viewing history", desc: "Remove watch history from our servers", icon: <EyeOff size={14} />, action: clearFavourites },
          { label: "Export my data", desc: "Download a copy of your data", icon: <Globe size={14} />, action: () => toast("Coming soon", { icon: "📦" }) },
        ].map((item) => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] -mx-1 px-1 rounded transition group">
            <div className="flex items-center gap-3">
              <div className="text-zinc-400 group-hover:text-zinc-200 transition">{item.icon}</div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition" />
          </button>
        ))}
      </SectionCard>

      <SaveBtn onClick={() => savePrefs("privacy")} loading={prefsLoading} label="Save Settings" />
    </div>
  );

  const sectionContent: Record<Section, React.ReactNode> = {
    profile:       renderProfile(),
    security:      renderSecurity(),
    playback:      renderPlayback(),
    notifications: renderNotifications(),
    privacy:       renderPrivacy(),
  };

  const activeLabel = navItems.find((n) => n.id === activeSection)?.label;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <nav className="w-full px-4 md:px-10 py-5 flex items-center border-b border-white/[0.06] sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-30">
        <button onClick={() => router.push("/main")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition group mr-6" id="back-to-main-btn">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <Image src="/images/logo2.png" alt="ChillFlix" width={100} height={30} className="h-7 w-auto" />
          <span className="text-zinc-600 text-sm hidden sm:inline">/ Settings</span>
        </div>
        {/* Mobile section picker */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-zinc-300 sm:hidden border border-white/10 px-3 py-1.5 rounded-lg">
          {activeLabel}
          <ChevronRight size={14} className={`transition-transform ${mobileMenuOpen ? "rotate-90" : ""}`} />
        </button>
      </nav>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-zinc-900 border-b border-white/[0.06] px-4 py-2 z-20">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition ${activeSection === item.id ? "text-white bg-white/[0.06]" : "text-zinc-400"}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Layout */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden sm:block w-52 flex-shrink-0">
          <nav className="sticky top-24 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} id={`settings-nav-${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                  activeSection === item.id
                    ? "bg-white/[0.08] text-white border border-white/[0.08]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}>
                <span className={`transition-colors ${activeSection === item.id ? "text-red-400" : "text-zinc-500"}`}>
                  {item.icon}
                </span>
                {item.label}
                {activeSection === item.id && <ChevronRight size={12} className="ml-auto text-zinc-500" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div key={activeSection} style={{ animation: "fadeInUp 0.2s ease-out" }}>
            {sectionContent[activeSection]}
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Settings;
