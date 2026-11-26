import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkIsAdmin } from '../lib/supabase';
import { ShieldAlert, Loader2, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from './ui';

/**
 * Route protection guard for the DEX STORES Administrator Interface.
 *
 * Enforces:
 * 1. Active authenticated Supabase session.
 * 2. Trusted `app_metadata` administrator role verification.
 */
export const AdminGuard: React.FC = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F7FAF8] p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF5EE] border border-[#C6E5D2] flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 text-[#176B45] animate-spin" aria-hidden="true" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#123D2A]">
          Verifying Administrator Session
        </h2>
        <p className="text-xs text-[#5C6B62] mt-1">DEX STORES Secure Gateway</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    const liveAdminVerdict = checkIsAdmin(user);

    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7FAF8] p-4">
        <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-2xl shadow-md max-w-md w-full border border-[#E2EAE5] text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#17231C]">Access Denied</h1>
            <p className="text-sm text-[#5C6B62] mt-2">
              Your account (<span className="font-semibold text-[#17231C]">{user.email}</span>) is signed in,
              but does not possess the trusted administrator role.
            </p>
          </div>

          <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl text-left text-xs text-red-800 space-y-1">
            <p className="font-semibold">Security Policy Notice</p>
            <p>
              Administrator permissions must be provisioned in{' '}
              <code className="font-mono bg-red-100 px-1.5 py-0.5 rounded">app_metadata.role = 'admin'</code>.
            </p>
          </div>

          <details className="text-left text-xs border border-[#E2EAE5] rounded-xl p-3 bg-[#F7FAF8]">
            <summary className="font-semibold text-[#5C6B62] cursor-pointer">
              Diagnostic Metadata Details
            </summary>
            <div className="mt-2 font-mono text-[11px] text-[#17231C] space-y-1 overflow-x-auto">
              <p>AuthContext isAdmin: {String(isAdmin)}</p>
              <p>checkIsAdmin(user): {String(liveAdminVerdict)}</p>
              <p>app_metadata: {JSON.stringify(user.app_metadata || {})}</p>
            </div>
          </details>

          <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="primary"
              fullWidth
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />}
            >
              Sign Out
            </Button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 border border-[#E2EAE5] text-[#5C6B62] hover:bg-[#F7FAF8] hover:text-[#17231C] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold min-h-[44px] dex-press"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Storefront</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
