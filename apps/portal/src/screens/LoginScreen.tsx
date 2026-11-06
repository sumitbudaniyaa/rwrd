import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LockIcon,
  Mail01Icon,
  AlertCircleIcon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons';
import { MotionButton, MotionCard, SlideUp, FadeIn } from '@tiptable/ui';
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <SlideUp>
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-900 text-white font-bold text-lg shadow-sm mb-4">
              TT
            </div>
            <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
              TipTable Control Plane
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Restricted internal management realm for platform administrators.
            </p>
          </div>

          <MotionCard className="p-8 bg-white border border-stone-200 rounded-2xl shadow-sm">
            {/* IP Allowlist Notice */}
            <div className="mb-6 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-center gap-2">
              <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Authorized access only. Connections are IP-monitored and audited.</span>
            </div>

            {errorMessage && (
              <FadeIn>
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                  />
                  <span>{errorMessage}</span>
                </div>
              </FadeIn>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@tiptable.in"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <HugeiconsIcon icon={LockIcon} className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <MotionButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading || !email || !password}
                  className="w-full justify-center bg-stone-900 hover:bg-stone-800 text-white"
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In to Control Plane'}
                </MotionButton>
              </div>
            </form>
          </MotionCard>
        </div>
      </SlideUp>
    </div>
  );
};
