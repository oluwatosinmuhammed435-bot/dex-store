import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { Button, Input } from '../../components/ui';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, user, isAdmin, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (user && isAdmin) {
      const target = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
      navigate(target, { replace: true });
    }
  }, [user, isAdmin, navigate, location]);

  const formatAuthError = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Invalid email or password. Please verify your administrator credentials in Supabase Auth.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Your email address is not confirmed yet. Open Supabase Dashboard → Authentication → Users and confirm this account (or enable Auto Confirm when inviting).';
    }
    if (lower.includes('failed to fetch') || lower.includes('network')) {
      return 'Unable to reach Supabase authentication service. Check your internet connection and VITE_SUPABASE_URL configuration.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error, isAdmin: userIsAdmin } = await signInWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(formatAuthError(error.message));
      return;
    }

    if (!userIsAdmin) {
      navigate('/admin');
      return;
    }

    const target = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
    navigate(target, { replace: true });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#EFF8F2] to-[#F7FAF8] p-4">
      <div className="bg-[#FFFFFF] p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-md border border-[#E2EAE5] space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#176B45] text-[#FFFFFF] font-display font-bold text-base inline-flex items-center justify-center shadow-2xs">
              D
            </span>
            <span className="text-xl font-extrabold text-[#123D2A] tracking-tight">DEX STORES</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#17231C]">Administrator Sign In</h1>
            <p className="text-xs text-[#5C6B62] mt-0.5">Secure Store Management Gateway</p>
          </div>
        </div>

        {!isConfigured && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Supabase Environment Notice</p>
              <p className="mt-0.5 text-amber-800">
                Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable live authentication.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="flex-1 font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@dexstores.com"
            leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Authenticating…' : 'Sign In as Administrator'}
          </Button>
        </form>

        <div className="pt-4 border-t border-[#E2EAE5] text-center space-y-2.5">
          <p className="text-[11px] text-[#5C6B62]">
            Requires <code className="font-mono bg-[#F2F6F3] px-1.5 py-0.5 rounded text-[#17231C]">app_metadata.role = 'admin'</code>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#176B45] hover:text-[#123D2A] hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
