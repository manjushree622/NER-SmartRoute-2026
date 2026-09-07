import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ner_smartroute_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('ner_smartroute_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <MapPage user={currentUser} onLogout={handleLogout} />;
}
