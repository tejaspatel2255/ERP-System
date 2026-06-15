import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser, logoutUser, refreshAccessToken } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || '');
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user && accessToken);

  useEffect(() => {
    const bootstrap = async () => {
      const storedAccess = localStorage.getItem('accessToken');
      const storedRefresh = localStorage.getItem('refreshToken');
      if (!storedAccess || !storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await getCurrentUser();
        setAccessToken(storedAccess);
        setUser(me.user);
      } catch (err) {
        try {
          const refreshed = await refreshAccessToken(storedRefresh);
          localStorage.setItem('accessToken', refreshed.accessToken);
          setAccessToken(refreshed.accessToken);
          const me = await getCurrentUser();
          setUser(me.user);
        } catch (refreshErr) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setAccessToken('');
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (err) {
      // Ignore server-side logout errors during client cleanup.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setAccessToken('');
      setUser(null);
    }
  };

  const refreshToken = async () => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) {
      throw new Error('No refresh token available.');
    }
    const result = await refreshAccessToken(storedRefresh);
    localStorage.setItem('accessToken', result.accessToken);
    setAccessToken(result.accessToken);
    return result.accessToken;
  };

  const value = useMemo(() => ({
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    setUser
  }), [user, accessToken, isAuthenticated, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export default AuthContext;
