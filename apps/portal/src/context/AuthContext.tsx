import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  setAccessToken,
  type PlatformUser,
  type PortalLoginResponse,
} from '../services/api.js';

interface PortalAuthContextValue {
  user: PlatformUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<PortalLoginResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<PortalAuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt session restoration on load
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const refreshRes = await api.refresh();
        if (mounted && refreshRes.accessToken) {
          setAccessToken(refreshRes.accessToken);
          setAccessTokenState(refreshRes.accessToken);

          const meRes = await api.getMe();
          if (mounted) {
            setUser(meRes.user);
          }
        }
      } catch {
        if (mounted) {
          setAccessToken(null);
          setUser(null);
          setAccessTokenState(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    setAccessTokenState(res.accessToken);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
    }
  }, []);

  const value: PortalAuthContextValue = {
    user,
    accessToken: accessTokenState,
    isAuthenticated: Boolean(user && accessTokenState),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): PortalAuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
