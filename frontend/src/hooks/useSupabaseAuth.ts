import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useSupabaseAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load auth state on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setAuth({
            user: {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || undefined,
            },
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuth({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setAuth({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    loadUser();

    // Subscribe to auth changes
    const subscription = authService.onAuthStateChange((user: any) => {
      if (user) {
        setAuth({
          user: {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || undefined,
          },
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuth({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.signIn(email, password);
    if (data.user) {
      setAuth({
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || undefined,
        },
        isLoading: false,
        isAuthenticated: true,
      });
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const data = await authService.signUp(email, password, name);
    if (data.user) {
      setAuth({
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || name || undefined,
        },
        isLoading: false,
        isAuthenticated: true,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setAuth({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...auth,
    login,
    register,
    logout,
  };
};
