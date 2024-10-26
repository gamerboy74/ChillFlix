import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-black p-8 text-gray-400">
    <div className="container mx-auto flex flex-col">
      {/* Contact Section */}
      <div className="mb-6">
        <h2 className="text-white text-lg font-bold mb-2">Questions? Call 1-800-123-4567</h2>
      </div>

      {/* Links Section */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div className="flex flex-col mb-4 md:mb-0">
          <a href="#" className="hover:text-white mb-1">FAQ</a>
          <a href="#" className="hover:text-white mb-1">Help Center</a>
          <a href="#" className="hover:text-white mb-1">Terms of Use</a>
          <a href="#" className="hover:text-white mb-1">Privacy</a>
          <a href="#" className="hover:text-white mb-1">Cookie Preferences</a>
        </div>
        <div className="flex flex-col">
          <a href="#" className="hover:text-white mb-1">Account</a>
          <a href="#" className="hover:text-white mb-1">Media Center</a>
          <a href="#" className="hover:text-white mb-1">Investor Relations</a>
          <a href="#" className="hover:text-white mb-1">Jobs</a>
          <a href="#" className="hover:text-white mb-1">Gift Cards</a>
        </div>
        <div className="flex flex-col">
          <a href="#" className="hover:text-white mb-1">Buy Gift Cards</a>
          <a href="#" className="hover:text-white mb-1">Ways to Watch</a>
          <a href="#" className="hover:text-white mb-1">Corporate Information</a>
          <a href="#" className="hover:text-white mb-1">Legal Notices</a>
        </div>
      </div>
    </div>

    {/* Bottom Section */}
    <div className="mt-6 border-t border-gray-700 pt-4">
      <p className="text-center">&copy; 2023 Chillflix. All rights reserved.</p>
      <div className="flex justify-center space-x-4 mt-2">
        <a href="#" className="hover:text-white">Facebook</a>
        <a href="#" className="hover:text-white">Twitter</a>
        <a href="#" className="hover:text-white">Instagram</a>
      </div>
    </div>
  </footer>
);

export default Footer;
