import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { logout } from '../api/auth';
import { tokenStore } from '../api/client';
import type { AppUser } from '../api/types';
import { AuthContext } from './auth-context';

const USER_KEY = 'chainone.user';
const LOGIN_AT_KEY = 'chainone.loginAt';

/** 'YYYY-MM-DD HH:mm' (지금 시각) */
function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function readLoginAt(): string | null {
  try {
    return sessionStorage.getItem(LOGIN_AT_KEY);
  } catch {
    return null;
  }
}

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
  const [loginAt, setLoginAt] = useState<string | null>(readLoginAt);

  const signIn = useCallback((token: string, u: AppUser) => {
    tokenStore.set(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    const at = stamp();
    sessionStorage.setItem(LOGIN_AT_KEY, at);
    setLoginAt(at);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      tokenStore.clear();
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(LOGIN_AT_KEY);
      setLoginAt(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loginAt, signIn, signOut }),
    [user, loginAt, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
