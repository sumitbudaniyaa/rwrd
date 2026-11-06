import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { MotionCard, MotionButton, SlideUp } from '@tiptable/ui';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email, password);

      if (res.mfaRequired) {
        navigate('/admin/mfa', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Failed to sign in. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <SlideUp>
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          {/* Brand Logo & Header */}
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center text-indigo-600 font-bold text-xl mb-4">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Sign in to rwrd Admin
          </h1>
          <p className="mt-2 text-xs text-stone-500">
            Enter your credentials to access your restaurant management portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <MotionCard className="py-8 px-6 sm:px-10 border border-stone-200">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed"
                >
                  {errorMessage}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-stone-700 mb-1.5">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@restaurant.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-stone-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative rounded-xl">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  >
                    <HugeiconsIcon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      className="w-4 h-4"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <MotionButton
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-600"
                >
                  Sign in
                </MotionButton>
              </div>
            </form>
          </MotionCard>

          <p className="mt-6 text-center text-xs text-stone-400">
            Protected by rwrd dual-realm auth & AES-256 encrypted storage
          </p>
        </div>
      </SlideUp>
    </div>
  );
};
