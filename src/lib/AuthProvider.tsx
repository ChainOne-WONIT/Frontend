import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { logout } from '../api/auth';
import { tokenStore } from '../api/client';
import type { AppUser } from '../api/types';
import { AuthContext } from './auth-context';

const USER_KEY = 'chainone.user';

function readUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw && tokenStore.get() ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(readUser);

  const signIn = useCallback((token: string, u: AppUser) => {
    tokenStore.set(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      tokenStore.clear();
      sessionStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
