import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, checkIsAdmin } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | Error | null; isAdmin?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!configured) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[DEX STORES Auth] Error fetching active session:', error.message);
        }

        if (mounted) {
          const currentSession = data.session;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setIsAdmin(checkIsAdmin(currentSession?.user));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[DEX STORES Auth] Unexpected initialization error:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setIsAdmin(checkIsAdmin(newSession?.user));
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!configured) {
      return {
        error: new Error(
          'Supabase credentials are not configured in your environment. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        ),
      };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      const currentUser = data.user;
      const userIsAdmin = checkIsAdmin(currentUser);

      setUser(currentUser);
      setSession(data.session);
      setIsAdmin(userIsAdmin);
      setIsLoading(false);

      return { error: null, isAdmin: userIsAdmin };
    } catch (err) {
      setIsLoading(false);
      return {
        error: err instanceof Error ? err : new Error('An unexpected authentication error occurred.'),
      };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (configured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[DEX STORES Auth] Error during sign-out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    isAdmin,
    isLoading,
    isConfigured: configured,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
