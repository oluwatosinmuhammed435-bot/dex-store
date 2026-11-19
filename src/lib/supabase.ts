/**
 * DEX STORES — Supabase Client & Security Configuration
 *
 * Architecture & Security Guidelines:
 * 1. Only the public Anonymous Key (anon key) is consumed on the frontend.
 * 2. The Service Role Key is NEVER imported or referenced here.
 * 3. Authorization is strictly decoupled from authentication:
 *    An account is ONLY an administrator if its `app_metadata` contains:
 *      - `role === 'admin'` OR
 *      - `roles.includes('admin')` OR
 *      - `is_admin === true`
 *    `user_metadata` is untrusted and NEVER checked for role escalation.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Safe environment resolution across Vite browser runtime and Node testing runners
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? (process.env as unknown as Record<string, string>)
    : ({} as Record<string, string>);

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-anon')
  );
};

// Safe fallback URL/key to prevent initialization crashes when environment variables are not yet populated
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'dex_stores_admin_auth_v1',
    },
  }
);

/**
 * Validates whether a given authenticated user possesses the trusted administrator role.
 * IMPORTANT: Only checks `app_metadata`. `user_metadata` is completely ignored because
 * end-users can edit their own `user_metadata` via the client API.
 */
export function checkIsAdmin(user: User | null | undefined): boolean {
  if (!user || !user.app_metadata) {
    return false;
  }

  const appMeta = user.app_metadata as Record<string, unknown>;

  // Check role: 'admin'
  if (appMeta.role === 'admin') {
    return true;
  }

  // Check roles array: ['admin', ...]
  if (Array.isArray(appMeta.roles) && appMeta.roles.includes('admin')) {
    return true;
  }

  // Check is_admin boolean
  if (appMeta.is_admin === true) {
    return true;
  }

  return false;
}
