import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasAdmin: boolean | null;
  loginAdmin: (token: string, userData: User) => void;
  loginStudent: (token: string, userData: User) => void;
  logout: () => void;
  refreshSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  const checkSetupStatus = async () => {
    try {
      const res = await api.get('/auth/setup-status');
      if (res.success) {
        setHasAdmin(res.hasAdmin);
      }
    } catch (err) {
      console.error('Failed to check admin setup status:', err);
    }
  };

  const loadUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        removeAuthToken();
        setUser(null);
      }
    } catch (err) {
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
    loadUser();

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  const loginAdmin = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
    setHasAdmin(true);
  };

  const loginStudent = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasAdmin,
        loginAdmin,
        loginStudent,
        logout,
        refreshSetupStatus: checkSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
