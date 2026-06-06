import NavbarItem from "@/components/NavbarItem";
import { BsBell, BsChevronDown, BsSearch } from "react-icons/bs";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

const MobileMenu = dynamic(() => import("@/components/MobileMenu"));
const AccountMenu = dynamic(() => import("@/components/AccountMenu"));

const TOP_OFFSET = 66;

const Navbar = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setShowBackground(window.scrollY >= TOP_OFFSET);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu((prev) => !prev);
  }, []);

  const toggleAccountMenu = useCallback(() => {
    setShowAccountMenu((prev) => !prev);
  }, []);

  const goToMembershipPage = () => router.push("/membership");

  return (
    <nav className="w-full fixed z-40 top-0 left-0">
      {/* Main bar */}
      <div
        className={`px-4 md:px-12 lg:px-16 py-4 flex flex-row items-center transition-all duration-500 ease-out
          ${showBackground
            ? "bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06)]"
            : "bg-gradient-to-b from-black/80 to-transparent"
          }`}
      >
        {/* Logo */}
        <div
          className="cursor-pointer flex-shrink-0 mr-10"
          onClick={() => router.push("/main")}
        >
          <Image
            src="/images/logo2.png"
            alt="ChillFlix"
            width={140}
            height={40}
            priority
            className="h-8 lg:h-10 w-auto object-contain"
          />
        </div>

        {/* Desktop Nav Links */}
        <div className="flex-row ml-2 gap-1 hidden lg:flex items-center">
          <NavbarItem label="Home" onClick={() => router.push("/main")} active={router.pathname === "/main"} />
          <NavbarItem label="Series" onClick={() => router.push("/series")} active={router.pathname === "/series"} />
          <NavbarItem label="Movies" onClick={() => router.push("/movies")} active={router.pathname === "/movies"} />
          <NavbarItem label="New & Popular" onClick={() => router.push("/popular")} active={router.pathname === "/popular"} />
          <NavbarItem label="My List" onClick={() => router.push("/my-list")} active={router.pathname === "/my-list"} />
          <NavbarItem label="Membership" onClick={goToMembershipPage} active={router.pathname === "/membership"} />
          <NavbarItem label="Admin" onClick={() => router.push("/admin")} active={router.pathname === "/admin"} />
        </div>

        {/* Mobile Browse toggle */}
        <div
          onClick={toggleMobileMenu}
          className="lg:hidden flex flex-row items-center gap-2 ml-6 cursor-pointer relative"
        >
          <p className="text-white text-sm font-medium">Browse</p>
          <BsChevronDown
            className={`text-white transition-transform duration-200 ${showMobileMenu ? "rotate-180" : "rotate-0"}`}
            size={12}
          />
          <MobileMenu visible={showMobileMenu} />
        </div>

        {/* Right-side icons */}
        <div className="flex flex-row ml-auto gap-5 items-center">
          {/* Search */}
          <div className="relative flex items-center">
            {showSearch && (
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                placeholder="Titles, people, genres"
                className="animate-slide-down bg-zinc-950/90 border border-white/20 text-white text-xs px-3 py-2 pr-8 rounded-md w-40 sm:w-52 placeholder:text-zinc-500 focus:outline-none focus:border-white/40 transition-all mr-1"
              />
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-zinc-300 hover:text-white transition-colors p-1"
              aria-label="Search"
            >
              <BsSearch size={16} />
            </button>
          </div>

          {/* Bell */}
          <button
            className="relative text-zinc-300 hover:text-white transition-colors p-1"
            aria-label="Notifications"
          >
            <BsBell size={18} />
            {/* Notification dot */}
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-[#0a0a0a]" />
          </button>

          {/* Profile */}
          <div
            onClick={toggleAccountMenu}
            className="flex flex-row items-center gap-2 cursor-pointer relative group"
          >
            <div className="w-8 h-8 rounded-md overflow-hidden ring-2 ring-transparent group-hover:ring-white/30 transition-all duration-200">
              <Image
                src="/images/default-blue.png"
                alt="profile"
                className="object-cover"
                height={60}
                width={60}
              />
            </div>
            <BsChevronDown
              className={`text-zinc-400 transition-transform duration-200 ${showAccountMenu ? "rotate-180" : "rotate-0"}`}
              size={11}
            />
            <AccountMenu visible={showAccountMenu} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
