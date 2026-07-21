import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getCurrentUser, loginUser, logoutUser, refreshAccessToken } from '../api/authApi';
import { setMemoryToken } from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const updateAccessToken = useCallback((token) => {
    setMemoryToken(token);
    setAccessTokenState(token);
  }, []);

  const isAuthenticated = Boolean(user && accessToken);

  useEffect(() => {
    window.__onAccessTokenRefreshed = (newToken) => {
      updateAccessToken(newToken);
    };

    window.__onAuthSessionExpired = () => {
      updateAccessToken('');
      setUser(null);
    };

    return () => {
      delete window.__onAccessTokenRefreshed;
      delete window.__onAuthSessionExpired;
    };
  }, [updateAccessToken]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const refreshed = await refreshAccessToken();
        updateAccessToken(refreshed.accessToken);
        const me = await getCurrentUser();
        setUser(me.user);
      } catch (err) {
        updateAccessToken('');
        setUser(null);
      } finally {
        // Clear any residual legacy tokens from localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [updateAccessToken]);

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    updateAccessToken(result.accessToken);
    setUser(result.user);
    // Cleanup any lingering localStorage auth entries
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return result.user;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Ignore server-side logout errors during client cleanup.
    } finally {
      updateAccessToken('');
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  };

  const refreshToken = async () => {
    const result = await refreshAccessToken();
    updateAccessToken(result.accessToken);
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
