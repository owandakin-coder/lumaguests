import { useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const TOKEN_KEY = 'luma_guests_token';
const USER_KEY = 'luma_guests_user';

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load auth from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuth({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAuth({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } else {
      setAuth((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback((user: User, token: string) => {
    setAuth({
      user,
      token,
      isLoading: false,
      isAuthenticated: true,
    });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  const register = useCallback((user: User, token: string) => {
    setAuth({
      user,
      token,
      isLoading: false,
      isAuthenticated: true,
    });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setAuth({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  return {
    ...auth,
    login,
    register,
    logout,
  };
};
