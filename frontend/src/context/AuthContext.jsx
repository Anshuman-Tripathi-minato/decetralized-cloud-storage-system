import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('decentrastore-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('decentrastore-admin');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('decentrastore-token') || null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('decentrastore-admin-token') || null);

  const login = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('decentrastore-user', JSON.stringify(userData));
    localStorage.setItem('decentrastore-token', jwt);
  };

  const adminLogin = (adminData, jwt) => {
    setAdminUser(adminData);
    setAdminToken(jwt);
    localStorage.setItem('decentrastore-admin', JSON.stringify(adminData));
    localStorage.setItem('decentrastore-admin-token', jwt);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('decentrastore-user');
    localStorage.removeItem('decentrastore-token');
  };

  const adminLogout = () => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem('decentrastore-admin');
    localStorage.removeItem('decentrastore-admin-token');
  };

  return (
    <AuthContext.Provider value={{ user, adminUser, token, adminToken, login, adminLogin, logout, adminLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
