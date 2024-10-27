import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/auth'); // Redirect to auth page
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-black bg-opacity-0 absolute top-0 left-0 w-full">
      <a href="#"><img className='h-[50px] w-[200px] mt-2' src="/images/logo2.png" alt="logo" /></a>
      <button className="bg-red-600 px-4 py-2 text-white rounded" onClick={handleRedirect}>Sign In</button>
    </nav>
  );
};

export default Navbar;
