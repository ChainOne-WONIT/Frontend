import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { logout } from '../api/auth';
import { tokenStore } from '../api/client';
import type { CorpUser } from '../api/types';
import { AuthContext } from './auth-context';

const USER_KEY = 'chainone.user';

function readUser(): CorpUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw && tokenStore.get() ? (JSON.parse(raw) as CorpUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CorpUser | null>(readUser);

  const signIn = useCallback((token: string, u: CorpUser) => {
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
