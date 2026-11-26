import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, checkIsAdmin } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | Error | null; isAdmin?: boolean }>;
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

    async function verifyAndSetSession(activeSession: Session | null) {
      if (!activeSession) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      // Fail-closed server verification: verify current token against Supabase Auth.
      // Never grant admin privileges from unverified cached localStorage metadata if verification fails.
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(
          activeSession.access_token
        );

        if (!mounted) return;

        if (userError || !userData?.user) {
          console.warn('Administrator session verification failed:', userError?.message || 'No user');
          setSession(activeSession);
          setUser(userError?.status === 401 || userError?.status === 403 ? null : activeSession.user);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const verifiedUser = userData.user;
        setSession(activeSession);
        setUser(verifiedUser);
        setIsAdmin(checkIsAdmin(verifiedUser));
        setIsLoading(false);
      } catch (err) {
        console.warn('Could not verify active user session against server:', err);
        if (mounted) {
          setSession(activeSession);
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    }

    async function initializeAuth() {
      if (!configured) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('Error retrieving stored auth session:', sessionError.message);
        }
        await verifyAndSetSession(sessionData?.session ?? null);
      } catch (err) {
        console.warn('Unexpected auth initialization error:', err);
        if (mounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      await verifyAndSetSession(newSession);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!configured) {
      return {
        error: new Error(
          'Supabase credentials are not configured in your environment.'
        ),
      };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session?.access_token) {
        setIsLoading(false);
        return { error: error || new Error('Sign-in failed to establish a session.') };
      }

      // Server-verify the freshly issued access token via getUser()
      const { data: userData, error: userError } = await supabase.auth.getUser(
        data.session.access_token
      );

      if (userError || !userData?.user) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        return {
          error: new Error(
            userError?.message || 'Unable to verify administrator credentials with server.'
          ),
          isAdmin: false,
        };
      }

      const verifiedUser = userData.user;
      const userIsAdmin = checkIsAdmin(verifiedUser);

      setUser(verifiedUser);
      setSession(data.session);
      setIsAdmin(userIsAdmin);
      setIsLoading(false);

      return { error: null, isAdmin: userIsAdmin };
    } catch (err) {
      setIsAdmin(false);
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
      console.warn('Error during sign-out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isLoading,
        isConfigured: configured,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
