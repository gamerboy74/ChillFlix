import React from "react";

interface NavbarItemProps {
    label: string;
    onClick?: () => void; 
}

const NavbarItem: React.FC<NavbarItemProps> = ({ label, onClick }) => {
    return (
        <div onClick={onClick} className="text-white cursor-pointer hover:text-gray-300 transition">
            {label}
        </div>
    );
}

export default NavbarItem;
