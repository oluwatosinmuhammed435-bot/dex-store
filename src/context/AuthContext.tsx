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

      console.log('[DEX_AUTH_DIAG][initializeAuth] Starting auth initialization...');

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('[DEX_AUTH_DIAG][initializeAuth] getSession error:', sessionError.message);
        }

        const currentSession = sessionData?.session ?? null;
        console.log('[DEX_AUTH_DIAG][initializeAuth] getSession result:', {
          hasSession: Boolean(currentSession),
          sessionUserEmail: currentSession?.user?.email,
          sessionUserAppMetadata: currentSession?.user?.app_metadata,
        });

        if (currentSession) {
          // If active session exists, verify live user directly from Supabase Auth server
          // Passing access_token directly avoids storage-lock deadlocks in GoTrue.
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser(currentSession.access_token);

            console.log('[DEX_AUTH_DIAG][initializeAuth] getUser(token) result:', {
              hasUserData: Boolean(userData?.user),
              liveUserEmail: userData?.user?.email,
              liveUserAppMetadata: userData?.user?.app_metadata,
              userError: userError ? { status: userError.status, message: userError.message } : null,
            });

            if (mounted) {
              const activeUser = userData?.user ?? currentSession.user ?? null;
              const adminVerdict = checkIsAdmin(activeUser);

              console.log('[DEX_AUTH_DIAG][initializeAuth] Final evaluated admin status:', {
                adminVerdict,
                userSource: userData?.user ? 'server_verified' : 'session_fallback',
              });

              setSession(currentSession);
              setUser(activeUser);
              setIsAdmin(adminVerdict);
              setIsLoading(false);
            }
          } catch (verifyErr) {
            console.error('[DEX_AUTH_DIAG][initializeAuth] getUser threw exception:', verifyErr);
            if (mounted) {
              const adminVerdict = checkIsAdmin(currentSession.user);
              setSession(currentSession);
              setUser(currentSession.user ?? null);
              setIsAdmin(adminVerdict);
              setIsLoading(false);
            }
          }
        } else {
          console.log('[DEX_AUTH_DIAG][initializeAuth] No active session found -> Unauthenticated');
          if (mounted) {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('[DEX_AUTH_DIAG][initializeAuth] Unexpected initialization error:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('[DEX_AUTH_DIAG][onAuthStateChange] Event fired:', {
          event,
          hasSession: Boolean(newSession),
          userEmail: newSession?.user?.email,
          sessionUserAppMetadata: newSession?.user?.app_metadata,
        });

        if (!newSession) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Fetch fresh server-verified user on auth state change
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser(newSession.access_token);
          console.log('[DEX_AUTH_DIAG][onAuthStateChange] getUser(token) response:', {
            hasUserData: Boolean(userData?.user),
            liveAppMetadata: userData?.user?.app_metadata,
            userError: userError ? { status: userError.status, message: userError.message } : null,
          });

          if (mounted) {
            const activeUser = userData?.user ?? newSession.user ?? null;
            const adminVerdict = checkIsAdmin(activeUser);

            console.log('[DEX_AUTH_DIAG][onAuthStateChange] Setting isAdmin =', adminVerdict);
            setSession(newSession);
            setUser(activeUser);
            setIsAdmin(adminVerdict);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('[DEX_AUTH_DIAG][onAuthStateChange] Exception in getUser:', err);
          if (mounted) {
            const adminVerdict = checkIsAdmin(newSession.user);
            console.log('[DEX_AUTH_DIAG][onAuthStateChange] Fallback setting isAdmin =', adminVerdict);
            setSession(newSession);
            setUser(newSession.user ?? null);
            setIsAdmin(adminVerdict);
            setIsLoading(false);
          }
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

    console.log('[DEX_AUTH_DIAG][signInWithEmail] Attempting signInWithPassword for:', email);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn('[DEX_AUTH_DIAG][signInWithEmail] signInWithPassword error:', error.message);
        setIsLoading(false);
        return { error };
      }

      console.log('[DEX_AUTH_DIAG][signInWithEmail] signInWithPassword SUCCESS:', {
        userId: data.user?.id,
        email: data.user?.email,
        app_metadata: data.user?.app_metadata,
        user_metadata: data.user?.user_metadata,
      });

      // Verify live user metadata directly using access token
      let authenticatedUser = data.user;
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(data.session?.access_token);
        if (!userError && userData?.user) {
          authenticatedUser = userData.user;
          console.log('[DEX_AUTH_DIAG][signInWithEmail] getUser(token) confirmed user:', {
            app_metadata: authenticatedUser.app_metadata,
          });
        } else if (userError) {
          console.warn('[DEX_AUTH_DIAG][signInWithEmail] getUser(token) error:', userError.message);
        }
      } catch (userFetchErr) {
        console.warn('[DEX_AUTH_DIAG][signInWithEmail] Exception fetching live user, using returned payload:', userFetchErr);
      }

      const userIsAdmin = checkIsAdmin(authenticatedUser);
      console.log('[DEX_AUTH_DIAG][signInWithEmail] Final checkIsAdmin verdict:', userIsAdmin);

      setUser(authenticatedUser);
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
