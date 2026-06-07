import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const Navbar: React.FC = () => {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRedirect = () => {
    if (session) {
      // Check if profile cookie is set
      const hasProfile = document.cookie.split(';').some(c => c.trim().startsWith('chillflix_profile_id='));
      if (hasProfile) {
        window.location.href = '/main';
      } else {
        window.location.href = '/profiles';
      }
    } else {
      window.location.href = '/auth'; // Redirect to auth page
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${
      scrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.05]' : 'bg-transparent'
    }`}>
      <a href="#" className="hover:scale-[1.02] transition-transform duration-200">
        <img className="h-8 md:h-10 w-auto" src="/images/logo2.png" alt="logo" />
      </a>
      <button 
        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-red-600/10" 
        onClick={handleRedirect}
      >
        {session ? 'Go to App' : 'Sign In'}
      </button>
    </nav>
  );
};

export default Navbar;
