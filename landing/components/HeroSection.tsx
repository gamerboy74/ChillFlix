import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
  isAuthenticated: boolean; // Add a prop for authentication status
}

const HeroSection: React.FC<HeroSectionProps> = ({ isAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/main'); // Redirect to main if authenticated
    }
  }, [isAuthenticated, navigate]);

  const handleRedirect = () => {
    navigate('/auth'); // Redirect to auth page
  };

  return (
    <section className="h-screen bg-cover bg-center text-white" style={{ backgroundImage: "url('/images/img5.jpg')" }}>
      <div className="flex items-center justify-center h-full bg-black bg-opacity-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Unlimited movies, TV shows, and more.</h1>
          <p className="text-xl mt-4">Watch anywhere. Cancel anytime.</p>
          <button className="mt-8 bg-red-600 px-6 py-3 rounded" onClick={handleRedirect}>
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
