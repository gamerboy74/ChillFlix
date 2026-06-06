import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import LandingPage from '../landing/LandingPage';
import { AuthProvider, useAuth } from '../components/AuthContext'; // Import your AuthContext
import MainApp from './main';
import AuthPage from './auth'; // Import your authentication page

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
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/main" element={<ProtectedMainRoute />} /> {/* Use protected route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

// Protected route component
const ProtectedMainRoute: React.FC = () => {
  const { user } = useAuth(); // Now we can use useAuth here

  return user ? <MainApp /> : <Navigate to="/auth" />; // Redirect if not authenticated
};

export default App;
