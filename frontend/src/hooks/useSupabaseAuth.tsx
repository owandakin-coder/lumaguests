import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SupabaseAuthContext = createContext<AuthContextValue | null>(null);

const buildUser = (user: any): User => ({
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.name || undefined,
});

export const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setAuth({
            user: buildUser(user),
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

    const subscription = authService.onAuthStateChange((user: any) => {
      if (user) {
        setAuth({
          user: buildUser(user),
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
        user: buildUser(data.user),
        isLoading: false,
        isAuthenticated: true,
      });
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const data = await authService.signUp(email, password, name);
    if (data.user) {
      setAuth({
        user: buildUser(data.user),
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

  const value = useMemo<AuthContextValue>(() => ({
    ...auth,
    login,
    register,
    logout,
  }), [auth, login, logout, register]);

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);

  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }

  return context;
};
