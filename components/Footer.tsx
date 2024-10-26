import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-gray-400 p-8">
      <div className="text-center text-sm mb-4">
        Questions? Call 000-800-919-1694
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-around text-xs space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex flex-col space-y-2">
          <a href="/" className="hover:underline">FAQ</a>
          <a href="/" className="hover:underline">Investor Relations</a>
          <a href="/" className="hover:underline">Privacy</a>
          <a href="/" className="hover:underline">Speed Test</a>
        </div>
        <div className="flex flex-col space-y-2">
          <a href="/" className="hover:underline">Help Centre</a>
          <a href="/" className="hover:underline">Jobs</a>
          <a href="/" className="hover:underline">Cookie Preferences</a>
          <a href="/" className="hover:underline">Legal Notices</a>
        </div>
        <div className="flex flex-col space-y-2">
          <a href="/" className="hover:underline">Account</a>
          <a href="/" className="hover:underline">Ways to Watch</a>
          <a href="/" className="hover:underline">Corporate Information</a>
          <a href="/" className="hover:underline">Only on Netflix</a>
        </div>
        <div className="flex flex-col space-y-2">
          <a href="/" className="hover:underline">Media Centre</a>
          <a href="/" className="hover:underline">Terms of Use</a>
          <a href="/" className="hover:underline">Contact Us</a>
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
