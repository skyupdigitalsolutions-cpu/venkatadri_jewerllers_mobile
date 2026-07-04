import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authStore, AuthUser } from '@/store/authStore';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      console.log('[AuthContext] init — reading storage');
      const [t, u] = await Promise.all([authStore.getToken(), authStore.getUser()]);
      console.log('[AuthContext] init done — token:', t ? 'PRESENT' : 'NULL', 'user:', u ? (u.id ?? u.userId ?? 'no-id') : 'NULL');
      setToken(t);
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: AuthUser) => {
    console.log('[AuthContext] signIn — token present:', Boolean(newToken), 'user id:', newUser?.id ?? newUser?.userId);
    await Promise.all([authStore.saveToken(newToken), authStore.saveUser(newUser)]);
    setToken(newToken);
    setUser(newUser);
    console.log('[AuthContext] signIn complete — isAuthenticated will become true');
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] signOut');
    await authStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, isAuthenticated: !!token, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}
