import React from "react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/router";
import { BsPerson, BsGear } from "react-icons/bs";
import { MdLogout } from "react-icons/md";

interface AccountMenuProps {
  visible?: boolean;
}

const AccountMenu: React.FC<AccountMenuProps> = ({ visible }) => {
  const { data: user } = useCurrentUser();
  const router = useRouter();

  if (!visible) return null;

  return (
    <div className="animate-slide-down glass-card absolute top-12 right-0 w-56 rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50 border border-white/[0.07]">
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
          <Image
            src="/images/default-blue.png"
            alt="profile"
            className="object-cover"
            width={36}
            height={36}
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{user?.name ?? "Profile"}</p>
          <p className="text-zinc-500 text-[11px] truncate">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1.5">
        <button
          onClick={() => { window.location.href = "/profiles"; }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          <BsPerson size={15} className="text-zinc-500" />
          Manage Profiles
        </button>
        <button
          onClick={() => { window.location.href = "/settings"; }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          <BsGear size={14} className="text-zinc-500" />
          Account Settings
        </button>
      </div>

      <div className="border-t border-white/[0.06] py-1.5">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm"
        >
          <MdLogout size={16} />
          Sign out of ChillFlix
        </button>
      </div>
    </div>
  );
};

export default AccountMenu;
