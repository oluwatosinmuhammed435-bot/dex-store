/**
 * DEX STORES — Supabase Client & Security Configuration
 *
 * Security Invariants:
 * 1. Consumes ONLY the public Anonymous / Publishable Key (`VITE_SUPABASE_ANON_KEY`).
 * 2. Never imports or references a Service Role Key on the client.
 * 3. Administrator authorization strictly evaluates `app_metadata`
 *    (`role === 'admin'`, `roles.includes('admin')`, or `is_admin`).
 *    `user_metadata` is untrusted and completely ignored.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

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
 * IMPORTANT: Evaluates ONLY `app_metadata`. Never checks `user_metadata`.
 */
export function checkIsAdmin(user: User | null | undefined): boolean {
  if (!user || !user.app_metadata) {
    return false;
  }

  const appMeta = user.app_metadata as Record<string, unknown>;

  // 1. Singular role: case-insensitive string or array
  if (typeof appMeta.role === 'string' && appMeta.role.trim().toLowerCase() === 'admin') {
    return true;
  }
  if (
    Array.isArray(appMeta.role) &&
    appMeta.role.some((r) => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    return true;
  }

  // 2. Plural roles: array or string
  if (
    Array.isArray(appMeta.roles) &&
    appMeta.roles.some((r) => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    return true;
  }
  if (typeof appMeta.roles === 'string' && appMeta.roles.trim().toLowerCase() === 'admin') {
    return true;
  }

  // 3. Explicit boolean/string is_admin flag
  if (
    appMeta.is_admin === true ||
    appMeta.is_admin === 'true' ||
    appMeta.is_admin === '1' ||
    appMeta.is_admin === 't'
  ) {
    return true;
  }

  return false;
}
