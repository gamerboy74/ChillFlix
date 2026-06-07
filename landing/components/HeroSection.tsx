import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';

const HeroSection: React.FC = () => {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');

  const handleRedirect = () => {
    // Check if profile cookie is set
    const hasProfile = document.cookie.split(';').some(c => c.trim().startsWith('chillflix_profile_id='));
    if (hasProfile) {
      window.location.href = '/main';
    } else {
      window.location.href = '/profiles';
    }
  };

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    window.location.href = `/auth?email=${encodeURIComponent(email)}`;
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Cover with Opacity & Vignette overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/img5.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.85)_100%)]" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl px-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Unlimited movies,<br />TV shows, and more.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-300 mt-4 font-medium">
          Watch anywhere. <span className="text-red-500 font-extrabold">100% Free.</span>
        </p>

        {session ? (
          <div className="mt-8 flex flex-col items-center gap-4 animate-fade-in">
            <p className="text-zinc-400 text-sm sm:text-base font-semibold">
              Welcome back, <span className="text-white font-extrabold">{session.user?.name || 'Member'}</span>! Ready to dive in?
            </p>
            <button 
              className="bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold px-8 py-4 rounded-xl flex items-center gap-2 transition-all text-sm whitespace-nowrap shadow-lg shadow-red-600/30"
              onClick={handleRedirect}
            >
              Watch Now <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Lead gen form */}
            <form onSubmit={handleGetStarted} className="mt-8 flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 bg-black/60 border border-zinc-700/60 focus:border-red-600 focus:ring-1 focus:ring-red-600/30 rounded-xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none transition-all text-sm backdrop-blur-sm"
              />
              <button 
                type="submit"
                className="bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm whitespace-nowrap shadow-lg shadow-red-600/20"
              >
                Get Started <ChevronRight size={18} />
              </button>
            </form>
            <p className="text-xs text-zinc-500 mt-4 leading-normal">
              Ready to watch? Enter your email to create or restart your membership.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
