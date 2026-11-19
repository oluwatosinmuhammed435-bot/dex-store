import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, LogOut, ArrowLeft } from 'lucide-react';

/**
 * Route protection guard for the DEX STORES Administrator Interface.
 *
 * Enforces two separate security barriers:
 * 1. Authentication Check: User must have an active Supabase session.
 * 2. Authorization Check: User MUST have `app_metadata.role = 'admin'`.
 *    Ordinary authenticated users without this metadata are explicitly blocked.
 */
export const AdminGuard: React.FC = () => {
  const { user, isAdmin, isLoading, isConfigured, signOut } = useAuth();
  const location = useLocation();

  // 1. Loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5FAF5] p-6 text-center">
        <Loader2 className="w-8 h-8 text-[#123D2A] animate-spin mb-3" />
        <h2 className="text-lg font-semibold text-[#123D2A]">Verifying Administrator Session</h2>
        <p className="text-xs text-[#69746D] mt-1">DEX STORES Secure Admin Gateway</p>
      </div>
    );
  }

  // 2. Unauthenticated check -> Redirect to login
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated BUT not an authorized Administrator (Part B requirement)
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5FAF5] p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full border border-red-200 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#202923]">Access Denied</h1>
            <p className="text-sm text-[#69746D] mt-2">
              Your account (<span className="font-medium text-[#202923]">{user.email}</span>) is signed in,
              but does not possess the trusted administrator role.
            </p>
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-left text-xs text-red-800 space-y-1">
            <p className="font-semibold">Security Policy Notice:</p>
            <p>
              DEX STORES enforces strict Role-Based Access Control (RBAC). Administrator rights
              must be provisioned in <code className="font-mono bg-red-100 px-1 rounded">app_metadata.role = 'admin'</code>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => signOut()}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#123D2A] text-white px-4 py-2.5 rounded-md hover:bg-[#0f2e1e] transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 border border-[#E5EBE6] text-[#69746D] px-4 py-2.5 rounded-md hover:bg-gray-50 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated & Authorized Administrator
  return <Outlet />;
};
