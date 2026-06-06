import React from "react";
import Link from "next/link";

interface MobileMenuProps {
    visible?: boolean;
    isAdmin?: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ visible, isAdmin }) => {
    if (!visible) return null;

    return (
        <div className="bg-black w-56 absolute top-8 left-0 py-5 flex-col border-2 border-gray-800 flex">
            <div className="flex flex-col gap-4">
                <Link href="/main" className="px-3 text-center text-white hover:underline cursor-pointer">
                    Home
                </Link>
                <Link href="/series" className="px-3 text-center text-white hover:underline cursor-pointer">
                    Series
                </Link>
                <Link href="/movies" className="px-3 text-center text-white hover:underline cursor-pointer">
                    Movies
                </Link>
                <Link href="/popular" className="px-3 text-center text-white hover:underline cursor-pointer">
                    New & Popular
                </Link>
                <Link href="/my-list" className="px-3 text-center text-white hover:underline cursor-pointer">
                    My List
                </Link>
                <Link href="/main" className="px-3 text-center text-white hover:underline cursor-pointer">
                    Browse by Languages
                </Link>
                {isAdmin && (
                    <Link href="/admin" className="px-3 text-center text-white hover:underline cursor-pointer">
                        Admin
                    </Link>
                )}
            </div>
        </div>
    );
};

export default MobileMenu;
