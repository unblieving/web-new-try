"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "./types";
import { getMe, logout as apiLogout } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: () => {},
});

async function fetchUser(): Promise<User | null> {
  try {
    return await getMe();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const me = await fetchUser();
    setUser(me);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUser().then((me) => {
      if (!cancelled) {
        setUser(me);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
