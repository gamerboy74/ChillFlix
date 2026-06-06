import React from "react";
import Link from "next/link";

interface NavbarItemProps {
  label: string;
  href: string;
  active?: boolean;
}

const NavbarItem: React.FC<NavbarItemProps> = ({ label, href, active }) => {
  return (
    <Link
      href={href}
      className={`relative text-sm font-medium px-2 py-1 cursor-pointer transition-colors duration-200
        ${active
          ? "text-white"
          : "text-zinc-400 hover:text-white"
        }
        group`}
    >
      {label}
      {/* Active underline */}
      <span className={`absolute bottom-0 left-2 right-2 h-px bg-white transition-transform duration-200 origin-left
        ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
      />
    </Link>
  );
};

export default NavbarItem;
