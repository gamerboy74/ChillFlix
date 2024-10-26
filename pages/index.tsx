import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import LandingPage from '../landing/LandingPage';
import { AuthProvider, useAuth } from './AuthContext'; // Import your AuthContext
import MainApp from './main';

const App: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Set flag to true only on the client side
  }, []);

  if (!isClient) {
    return null; // Render nothing on the server-side
  }

  // Import BrowserRouter only after component mounts on client
  const BrowserRouter = require('react-router-dom').BrowserRouter;

  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/main" element={<MainApp />} />
        <Route path="*" element={<Navigate to="/" />} /> {/* Optional: Redirect unknown paths */}
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
