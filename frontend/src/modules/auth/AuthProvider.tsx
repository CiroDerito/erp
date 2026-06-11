import { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from '../../api/client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('erp_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  async function login(email: string, password: string) {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('erp_access_token', result.accessToken);
    localStorage.setItem('erp_user', JSON.stringify(result.user));
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem('erp_access_token');
    localStorage.removeItem('erp_user');
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user && localStorage.getItem('erp_access_token')), login, logout }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
