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
  if (!user) {
    console.warn('[DEX_AUTH_DIAG][checkIsAdmin] User is null or undefined -> FALSE');
    return false;
  }
  if (!user.app_metadata) {
    console.warn('[DEX_AUTH_DIAG][checkIsAdmin] user.app_metadata is missing -> FALSE', {
      userId: user.id,
      email: user.email,
      hasUserMetadata: Boolean(user.user_metadata),
      userMetadataKeys: Object.keys(user.user_metadata || {}),
    });
    return false;
  }

  const appMeta = user.app_metadata as Record<string, unknown>;
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;

  console.log('[DEX_AUTH_DIAG][checkIsAdmin] Evaluating user permissions:', {
    userId: user.id,
    email: user.email,
    app_metadata: appMeta,
    user_metadata: userMeta,
  });

  // 1. Check singular role: string (case-insensitive + trimmed) or array
  if (typeof appMeta.role === 'string' && appMeta.role.trim().toLowerCase() === 'admin') {
    console.log('[DEX_AUTH_DIAG][checkIsAdmin] MATCH: singular role string is "admin" -> TRUE');
    return true;
  }
  if (
    Array.isArray(appMeta.role) &&
    appMeta.role.some(r => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    console.log('[DEX_AUTH_DIAG][checkIsAdmin] MATCH: singular role array contains "admin" -> TRUE');
    return true;
  }

  // 2. Check plural roles: array or string (case-insensitive + trimmed)
  if (
    Array.isArray(appMeta.roles) &&
    appMeta.roles.some(r => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    console.log('[DEX_AUTH_DIAG][checkIsAdmin] MATCH: plural roles array contains "admin" -> TRUE');
    return true;
  }
  if (typeof appMeta.roles === 'string' && appMeta.roles.trim().toLowerCase() === 'admin') {
    console.log('[DEX_AUTH_DIAG][checkIsAdmin] MATCH: plural roles string is "admin" -> TRUE');
    return true;
  }

  // 3. Check is_admin flag: boolean or string ('true', '1', 't')
  if (
    appMeta.is_admin === true ||
    appMeta.is_admin === 'true' ||
    appMeta.is_admin === '1' ||
    appMeta.is_admin === 't'
  ) {
    console.log('[DEX_AUTH_DIAG][checkIsAdmin] MATCH: is_admin flag is true -> TRUE');
    return true;
  }

  console.warn('[DEX_AUTH_DIAG][checkIsAdmin] NO MATCH in app_metadata -> FALSE', {
    appMetaKeys: Object.keys(appMeta),
    roleValue: appMeta.role,
    rolesValue: appMeta.roles,
    isAdminValue: appMeta.is_admin,
    noteIfInUserMeta: userMeta.role || userMeta.roles || userMeta.is_admin ? 'ALERT: Role was found in user_metadata, but user_metadata cannot be trusted!' : 'No admin role in user_metadata either'
  });

  return false;
}
