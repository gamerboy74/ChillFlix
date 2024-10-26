import NavbarItem from "@/components/NavbarItem";
import { BsBell, BsChevronDown, BsSearch } from "react-icons/bs";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext"; // Import the useWallet hook
import { useRouter } from "next/router"; // Import router for navigation

const MobileMenu = dynamic(() => import("@/components/MobileMenu"));
const AccountMenu = dynamic(() => import("@/components/AccountMenu"));

const TOP_OFFSET = 66;

const Navbar = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const { walletAddress, connectWallet, logout } = useWallet(); // Access wallet context
  const router = useRouter(); // Initialize router

  useEffect(() => {
    const handleScroll = () => {
      setShowBackground(window.scrollY >= TOP_OFFSET);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu((prev) => !prev);
  }, []);

  const toggleAccountMenu = useCallback(() => {
    setShowAccountMenu((prev) => !prev);
  }, []);

  const goToMembershipPage = () => {
    router.push("/membership"); // Direct to the membership page
  };

  return (
    <nav className="w-full fixed z-40">
      <div
        className={`px-4 md:px-16 py-6 flex flex-row items-center transition duration-500 ${
          showBackground ? "bg-zinc-900 bg-opacity-90" : ""
        }`}
      >
        <img
          className="h-4 lg:h-[50px]"
          src="/images/logo2.png"
          alt="logo"
          loading="lazy"
        />
        <div className="flex-row ml-8 gap-8 hidden lg:flex">
          <NavbarItem label="Home" />
          <NavbarItem label="Series" />
          <NavbarItem label="Movies" />
          <NavbarItem label="New & Popular" />
          <NavbarItem label="My List" />
          <NavbarItem label="Browse by languages" />
          <NavbarItem label="Membership" onClick={goToMembershipPage} />
        </div>
        <div
          onClick={toggleMobileMenu}
          className="lg:hidden flex flex-row items-center gap-2 ml-8 cursor-pointer relative"
        >
          <p className="text-white text-sm">Browse</p>
          <BsChevronDown
            className={`text-white transition ${
              showMobileMenu ? "rotate-180" : "rotate-0"
            }`}
          />
          <MobileMenu visible={showMobileMenu} />
        </div>
        <div className="flex flex-row ml-auto gap-7 items-center">
          <div className="text-gray-200 hover:text-gray-300 cursor-pointer transition">
            <BsSearch />
          </div>
          <div className="text-gray-200 hover:text-gray-300 cursor-pointer transition">
            <BsBell />
          </div>
          <div>
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <p className="text-white">{`Wallet: ${walletAddress.slice(
                  0,
                  6
                )}...${walletAddress.slice(-4)}`}</p>
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                Connect Wallet
              </button>
            )}
          </div>
          <div
            onClick={toggleAccountMenu}
            className="flex flex-row items-center gap-2 cursor-pointer relative"
          >
            <div className="w-6 h-6 lg:w-10 lg:h-10 rounded-md overflow-hidden">
              <img src="/images/default-blue.png" alt="profile" />
            </div>
            <BsChevronDown
              className={`text-white transition ${
                showAccountMenu ? "rotate-180" : "rotate-0"
              }`}
            />
            <AccountMenu visible={showAccountMenu} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
