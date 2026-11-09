import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LockIcon,
  Mail01Icon,
  AlertCircleIcon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await login(email, password);

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/portal';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to authenticate platform credentials. Please verify your email and password.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <SlideUp>
        <div className="w-full max-w-sm">
          {/* Brand header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-stone-900 text-white font-bold text-sm shadow-2xs mb-3 font-mono">
              R
            </div>
            <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
              rwrd Control Plane
            </h1>
            <p className="mt-0.5 text-xs text-stone-500">
              Restricted internal management realm for platform administrators.
            </p>
          </div>

          <div className="p-6 bg-white border border-stone-200/80 rounded-xl shadow-2xs">
            {/* IP Allowlist Notice */}
            <div className="mb-4 p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg text-[11px] text-stone-600 flex items-center gap-2">
              <HugeiconsIcon
                icon={SecurityCheckIcon}
                className="w-3.5 h-3.5 text-stone-500 shrink-0"
                strokeWidth={1.5}
              />
              <span>Authorized access only. Connections are IP-monitored and audited.</span>
            </div>

            {errorMessage && (
              <FadeIn>
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <span>{errorMessage}</span>
                </div>
              </FadeIn>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                    <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@tiptable.in"
                    className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                    <HugeiconsIcon icon={LockIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full h-8 inline-flex items-center justify-center bg-stone-900 hover:bg-black text-white text-xs font-medium rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In to Control Plane'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SlideUp>
    </div>
  );
};
