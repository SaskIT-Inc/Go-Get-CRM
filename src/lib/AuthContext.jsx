import React, { createContext, useCallback, useContext, useState } from 'react';
import { api } from '@/api/apiClient';
import { getToken, clearToken } from '@/lib/auth-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    if (!getToken()) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message || 'Authentication required' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const loggedInUser = await api.auth.login(email, password);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return loggedInUser;
  }, []);

  const register = useCallback(async (data) => {
    const registeredUser = await api.auth.register(data);
    setUser(registeredUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return registeredUser;
  }, []);

  const verifyEmail = useCallback(async (data) => {
    const verifiedUser = await api.auth.verifyEmail(data);
    setUser(verifiedUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return verifiedUser;
  }, []);

  const acceptInvite = useCallback(async (data) => {
    const acceptedUser = await api.auth.acceptInvite(data);
    setUser(acceptedUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return acceptedUser;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authChecked,
        authError,
        checkUserAuth,
        login,
        register,
        verifyEmail,
        acceptInvite,
        logout,
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
