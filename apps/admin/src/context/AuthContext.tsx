import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  setAccessToken,
  type AdminUser,
  type AdminRestaurant,
  type LoginResponse,
  type RegisterInput,
  type ImpersonationDetails,
} from '../services/api.js';

interface AuthContextValue {
  user: AdminUser | null;
  restaurant: AdminRestaurant | null;
  accessToken: string | null;
  tempToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  impersonation: ImpersonationDetails | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (input: RegisterInput) => Promise<void>;
  verifyMfa: (code: string, isRecoveryCode?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  cancelMfa: () => void;
  exitImpersonation: () => void;
  refreshUser?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let activeRestorePromise: Promise<{
  user: AdminUser;
  restaurant: AdminRestaurant;
  accessToken: string;
  impersonation: ImpersonationDetails | null;
} | null> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt session restoration on app load (including support impersonation)
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        // Check for URL parameter ?impersonate_token= or stored impersonation token
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('impersonate_token');
        const storedToken = sessionStorage.getItem('tiptable_impersonate_token');
        const tokenToUse = urlToken || storedToken;

        if (tokenToUse) {
          if (urlToken) {
            sessionStorage.setItem('tiptable_impersonate_token', urlToken);
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
          }
          setAccessToken(tokenToUse);
          setAccessTokenState(tokenToUse);

          const meRes = await api.getMe();
          if (mounted) {
            setUser(meRes.user);
            setRestaurant(meRes.restaurant);
            setImpersonation(meRes.impersonation || { isImpersonated: true });
          }
          return;
        }

        if (!activeRestorePromise) {
          activeRestorePromise = (async () => {
            const refreshRes = await api.refresh();
            if (!refreshRes.accessToken) return null;
            setAccessToken(refreshRes.accessToken);
            const meRes = await api.getMe();
            return {
              user: meRes.user,
              restaurant: meRes.restaurant,
              accessToken: refreshRes.accessToken,
              impersonation: meRes.impersonation || null,
            };
          })().catch(() => null);
        }

        const sessionData = await activeRestorePromise;
        if (mounted && sessionData) {
          setAccessToken(sessionData.accessToken);
          setAccessTokenState(sessionData.accessToken);
          setUser(sessionData.user);
          setRestaurant(sessionData.restaurant);
          if (sessionData.impersonation) {
            setImpersonation(sessionData.impersonation);
          }
        }
      } catch {
        // No active session cookie or invalid token
        sessionStorage.removeItem('tiptable_impersonate_token');
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
    activeRestorePromise = null;
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

  const register = useCallback(async (input: RegisterInput): Promise<void> => {
    const res = await api.register(input);
    if (res.accessToken) {
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
    }
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
    activeRestorePromise = null;
    try {
      await api.logout();
    } catch {
      // Ignore
    } finally {
      sessionStorage.removeItem('tiptable_impersonate_token');
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      setRestaurant(null);
      setTempToken(null);
      setImpersonation(null);
    }
  }, []);

  const logoutAll = useCallback(async (): Promise<void> => {
    activeRestorePromise = null;
    try {
      await api.logoutAll();
    } catch {
      // Ignore
    } finally {
      sessionStorage.removeItem('tiptable_impersonate_token');
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      setRestaurant(null);
      setTempToken(null);
      setImpersonation(null);
    }
  }, []);

  const cancelMfa = useCallback(() => {
    setTempToken(null);
  }, []);

  const exitImpersonation = useCallback(() => {
    sessionStorage.removeItem('tiptable_impersonate_token');
    setAccessToken(null);
    setAccessTokenState(null);
    setUser(null);
    setRestaurant(null);
    setImpersonation(null);
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/login';
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
      setRestaurant(meRes.restaurant);
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextValue = {
    user,
    restaurant,
    accessToken: accessTokenState,
    tempToken,
    isAuthenticated: Boolean(user && accessTokenState),
    isLoading,
    impersonation,
    login,
    register,
    verifyMfa,
    logout,
    logoutAll,
    cancelMfa,
    exitImpersonation,
    refreshUser,
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
