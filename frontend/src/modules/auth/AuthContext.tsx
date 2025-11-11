import React from "react";
import { api, setAccessToken as setApiAccessToken } from "../../shared/api";

type AuthContextValue = {
  accessToken: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  tryRefreshOnBoot: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = React.useState<string | null>(() => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  });

  const persistToken = (token: string | null) => {
    setAccessToken(token);
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    setApiAccessToken(token);
  };

  const login = async (identifier: string, password: string) => {
    const resp = await api.post("/auth/login", { identifier, password });
    persistToken(resp.data.access_token);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // no-op
    } finally {
      persistToken(null);
    }
  };

  const isAuthenticated = () => Boolean(accessToken);

  const tryRefreshOnBoot = async () => {
    // If no token but refresh cookie might exist (same-origin via Vite proxy), try to refresh once
    if (!accessToken) {
      try {
        const resp = await api.post("/auth/refresh");
        persistToken(resp.data.access_token);
      } catch {
        // ignore
      }
    }
  };

  const value: AuthContextValue = {
    accessToken,
    login,
    logout,
    isAuthenticated,
    tryRefreshOnBoot,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

