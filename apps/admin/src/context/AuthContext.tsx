import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  setAccessToken,
  type AdminUser,
  type AdminRestaurant,
  type LoginResponse,
} from '../services/api.js';

interface AuthContextValue {
  user: AdminUser | null;
  restaurant: AdminRestaurant | null;
  accessToken: string | null;
  tempToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (code: string, isRecoveryCode?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  cancelMfa: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt silent session restoration on app load
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
            setRestaurant(meRes.restaurant);
          }
        }
      } catch {
        // No active session cookie
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.login(email, password);

    if (res.mfaRequired && res.tempToken) {
      setTempToken(res.tempToken);
      return res;
    }

    if (res.accessToken) {
      setAccessToken(res.accessToken);
      setAccessTokenState(res.accessToken);
      setUser(res.user);
      setTempToken(null);

      // Fetch restaurant details
      try {
        const meRes = await api.getMe();
        setRestaurant(meRes.restaurant);
      } catch {
        // Fallback
      }
    }

    return res;
  }, []);

  const verifyMfa = useCallback(
    async (code: string, isRecoveryCode = false): Promise<void> => {
      if (!tempToken) {
        throw new Error('No pending MFA session found. Please sign in again.');
      }

      const res = await api.verifyMfa(tempToken, code, isRecoveryCode);
      setAccessToken(res.accessToken);
      setAccessTokenState(res.accessToken);
      setUser(res.user);
      setTempToken(null);

      try {
        const meRes = await api.getMe();
        setRestaurant(meRes.restaurant);
      } catch {
        // Fallback
      }
    },
    [tempToken],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Ignore
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      setRestaurant(null);
      setTempToken(null);
    }
  }, []);

  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      await api.logoutAll();
    } catch {
      // Ignore
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      setRestaurant(null);
      setTempToken(null);
    }
  }, []);

  const cancelMfa = useCallback(() => {
    setTempToken(null);
  }, []);

  const value: AuthContextValue = {
    user,
    restaurant,
    accessToken: accessTokenState,
    tempToken,
    isAuthenticated: Boolean(user && accessTokenState),
    isLoading,
    login,
    verifyMfa,
    logout,
    logoutAll,
    cancelMfa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
