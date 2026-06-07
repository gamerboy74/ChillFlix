import React from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MoreReasons from './components/MoreReasons';
import FAQSection from './components/FAQSection';

const LandingPage: React.FC = () => (
  <div className="bg-black">
    <Navbar />
    <HeroSection />
    <HomePage />
    <MoreReasons />
    <FAQSection />
    <Footer />
  </div>
);

export default LandingPage;
