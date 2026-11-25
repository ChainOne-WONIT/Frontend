import { createContext, useContext } from 'react';
import type { AppUser } from '../api/types';

export interface AuthState {
  user: AppUser | null;
  signIn: (token: string, user: AppUser) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
