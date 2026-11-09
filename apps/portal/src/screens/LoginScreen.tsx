import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LockIcon,
  Mail01Icon,
  AlertCircleIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import { SlideUp, FadeIn } from '@tiptable/ui';
import { Input } from '../components/Input.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { useAuth } from '../context/AuthContext.js';
import logoImage from '../assets/logo.png';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
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
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-stone-950 flex items-center justify-center p-4 relative transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <SlideUp>
        <div className="w-full max-w-sm">
          {/* Brand header */}
          <div className="text-center mb-6">
            <img src={logoImage} alt="rwrd" className="h-10 w-auto mx-auto mb-3 object-contain" />
            <h1 className="text-sm font-medium text-stone-600 dark:text-stone-400 tracking-tight">
              rwrd Control Plane
            </h1>
          </div>

          <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xs transition-colors duration-200">
            {errorMessage && (
              <FadeIn>
                <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <span>{errorMessage}</span>
                </div>
              </FadeIn>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Staff Email Address"
                type="email"
                required
                value={email}
                onChange={setEmail}
                placeholder="staff@tiptable.in"
                leftIcon={<HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.5} />}
              />

              <Input
                label="Password"
                type={revealPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={setPassword}
                placeholder="••••••••••••"
                leftIcon={<HugeiconsIcon icon={LockIcon} className="w-4 h-4" strokeWidth={1.5} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setRevealPassword(!revealPassword)}
                    className="text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300 p-0.5 rounded transition-colors"
                    tabIndex={-1}
                  >
                    <HugeiconsIcon
                      icon={revealPassword ? ViewOffSlashIcon : ViewIcon}
                      className="w-3.5 h-3.5"
                      strokeWidth={1.5}
                    />
                  </button>
                }
              />

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full h-10 inline-flex items-center justify-center bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In to Control Plane'}
                </button>
              </div>
            </form>

            <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-4">
              Authorized access only. Connections are IP-monitored and audited.
            </p>
          </div>
        </div>
      </SlideUp>
    </div>
  );
};
