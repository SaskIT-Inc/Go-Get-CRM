import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { getToken, clearToken } from '@/lib/auth-storage';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();

// Every page/component that needs "am I a client or staff, what's my role"
// reads it from a SINGLE react-query cache entry keyed ['currentUser'] (see
// lib/permissions.js's useCurrentUser and the many direct useQuery(['currentUser'])
// call sites across src/pages). That cache — and every other cached entity
// list (leads, clients, tasks...) — must be wiped at every session boundary,
// or the next person to log in on this browser (a different role, or even a
// different person entirely) transiently sees the PREVIOUS session's cached
// data: stale role → wrong nav/home page, stale entity lists → a real data
// leak between accounts. This was the root cause of "logging in as staff
// after a client session still shows the client view."
const clearSessionCache = () => queryClientInstance.clear();

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
    clearSessionCache();
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return loggedInUser;
  }, []);

  const register = useCallback(async (data) => {
    const registeredUser = await api.auth.register(data);
    clearSessionCache();
    setUser(registeredUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return registeredUser;
  }, []);

  const verifyEmail = useCallback(async (data) => {
    const verifiedUser = await api.auth.verifyEmail(data);
    clearSessionCache();
    setUser(verifiedUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return verifiedUser;
  }, []);

  const acceptInvite = useCallback(async (data) => {
    const acceptedUser = await api.auth.acceptInvite(data);
    clearSessionCache();
    setUser(acceptedUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return acceptedUser;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    clearSessionCache();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Defends against the browser's back-forward cache: if this tab is ever
  // restored from bfcache (event.persisted), the JS heap resumes exactly as
  // it was frozen — including whatever isAuthenticated/user state was live
  // at that moment — without re-running any of our own logic. A stale
  // "still logged in" snapshot from before a logout can otherwise flash back
  // on "Back". Forcing a fresh auth re-check (against the real, current
  // localStorage token) on every bfcache restore closes that hole.
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        clearSessionCache();
        setAuthChecked(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
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
