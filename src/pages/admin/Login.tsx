import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Loader2, AlertCircle, Info, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, user, isAdmin, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in with admin privileges, redirect immediately
  React.useEffect(() => {
    if (user && isAdmin) {
      const target = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
      navigate(target, { replace: true });
    }
  }, [user, isAdmin, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error, isAdmin: userIsAdmin } = await signInWithEmail(email.trim(), password);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!userIsAdmin) {
      // User authenticated, but not authorized as admin.
      // Navigate to /admin where AdminGuard will display the explicit RBAC Access Denied screen.
      navigate('/admin');
      return;
    }

    // Success — redirect to destination or dashboard
    const target = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
    navigate(target, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5FAF5] p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-[#E0E0E0] space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-bold text-[#123D2A] tracking-wide">DEX STORES</span>
          </Link>
          <h1 className="text-lg font-semibold text-[#202923] mt-2">Administrator Sign In</h1>
          <p className="text-xs text-[#69746D] mt-0.5">Secure Role-Protected Management Portal</p>
        </div>

        {/* Configuration notice if Supabase keys are not yet configured in .env */}
        {!isConfigured && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Supabase Environment Notice</p>
              <p className="mt-0.5 text-amber-800">
                Live Supabase credentials are not yet configured in your <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file.
                Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable live authentication.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#202923] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#999]" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@dexstores.com"
                className="w-full pl-10 pr-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#202923] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#999]" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#123D2A] text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#123D2A] text-white py-2.5 rounded-md hover:bg-[#0f2e1e] transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <span>Sign In as Administrator</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E0E0E0] text-center space-y-2">
          <p className="text-[11px] text-[#69746D]">
            Administrator permissions require <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[#202923]">app_metadata.role = 'admin'</code>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#123D2A] hover:underline font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
