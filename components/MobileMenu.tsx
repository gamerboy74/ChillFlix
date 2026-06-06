import React from "react";
import { useRouter } from "next/router"; // Import useRouter from Next.js

interface MobileMenuProps {
    visible?: boolean;
    isAdmin?: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ visible, isAdmin }) => {
    const router = useRouter(); // Initialize useRouter

    // Function to handle navigation
    const handleNavigation = (path: string) => {
        router.push(path); // Use router to navigate to the specified path
    };

    if (!visible) return null;

    return (
        <div className="bg-black w-56 absolute top-8 left-0 py-5 flex-col border-2 border-gray-800 flex">
            <div className="flex flex-col gap-4">
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/main")} // Navigate to Home
                >
                    Home
                </div>
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/series")} // Navigate to Series
                >
                    Series
                </div>
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/movies")} // Navigate to Movies
                >
                    Movies
                </div>
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/popular")} // Navigate to New & Popular
                >
                    New & Popular
                </div>
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/my-list")} // Navigate to My List
                >
                    My List
                </div>
                <div
                    className="px-3 text-center text-white hover:underline cursor-pointer"
                    onClick={() => handleNavigation("/main")} // Navigate to Browse by Languages (redirect to main)
                >
                    Browse by Languages
                </div>
                {isAdmin && (
                    <div
                        className="px-3 text-center text-white hover:underline cursor-pointer"
                        onClick={() => handleNavigation("/admin")} // Navigate to Admin
                    >
                        Admin
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileMenu;
