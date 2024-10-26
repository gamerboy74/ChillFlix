import Link from 'next/link';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-gray-400 p-8">
      <div className="text-center text-sm mb-4">
        Questions? Call 000-800-919-1694
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-around text-xs space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex flex-col space-y-2">
          <Link href="/" className="hover:underline">FAQ</Link>
          <Link href="/" className="hover:underline">Investor Relations</Link>
          <Link href="/" className="hover:underline">Privacy</Link>
          <Link href="/" className="hover:underline">Speed Test</Link>
        </div>
        <div className="flex flex-col space-y-2">
          <Link href="/" className="hover:underline">Help Centre</Link>
          <Link href="/" className="hover:underline">Jobs</Link>
          <Link href="/" className="hover:underline">Cookie Preferences</Link>
          <Link href="/" className="hover:underline">Legal Notices</Link>
        </div>
        <div className="flex flex-col space-y-2">
          <Link href="/" className="hover:underline">Account</Link>
          <Link href="/" className="hover:underline">Ways to Watch</Link>
          <Link href="/" className="hover:underline">Corporate Information</Link>
          <Link href="/" className="hover:underline">Only on Netflix</Link>
        </div>
        <div className="flex flex-col space-y-2">
          <Link href="/" className="hover:underline">Media Centre</Link>
          <Link href="/" className="hover:underline">Terms of Use</Link>
          <Link href="/" className="hover:underline">Contact Us</Link>
        </div>
      </div>

      <div className="text-center mt-4">
        <button className="bg-gray-800 text-white px-4 py-2 rounded">English</button>
      </div>

      <div className="text-center mt-2 text-xs">
        Netflix India
      </div>
    </footer>
  );
};

export default Footer;
