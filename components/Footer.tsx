import Link from "next/link";
import React from "react";
import Image from "next/image";
import { BsTwitterX, BsInstagram, BsYoutube } from "react-icons/bs";

const Footer: React.FC = () => {
  const links = [
    ["FAQ", "Help Centre", "Account", "Media Centre"],
    ["Investor Relations", "Jobs", "Ways to Watch", "Terms of Use"],
    ["Privacy", "Cookie Preferences", "Corporate Info", "Contact Us"],
    ["Speed Test", "Legal Notices", "Only on ChillFlix", ""],
  ];

  return (
    <footer className="bg-[#0a0a0a] border-t border-white/[0.05] mt-16">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12">
        {/* Social links */}
        <div className="flex items-center gap-5 mb-8">
          <a href="#" aria-label="Twitter/X" className="text-zinc-500 hover:text-white transition-colors">
            <BsTwitterX size={18} />
          </a>
          <a href="#" aria-label="Instagram" className="text-zinc-500 hover:text-white transition-colors">
            <BsInstagram size={18} />
          </a>
          <a href="#" aria-label="YouTube" className="text-zinc-500 hover:text-white transition-colors">
            <BsYoutube size={20} />
          </a>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {links.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3">
              {col.filter(Boolean).map((label) => (
                <Link
                  key={label}
                  href="/"
                  className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors underline-offset-2 hover:underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Language selector */}
        <div className="mb-6">
          <button className="flex items-center gap-2 border border-zinc-700/60 hover:border-zinc-500 text-zinc-400 hover:text-white text-xs px-3 py-2 rounded-md transition-all">
            <span>🌐</span>
            <span>English</span>
          </button>
        </div>

        {/* Copyright */}
        <p className="text-zinc-600 text-xs">
          © {new Date().getFullYear()} ChillFlix. All rights reserved. For entertainment purposes only.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
