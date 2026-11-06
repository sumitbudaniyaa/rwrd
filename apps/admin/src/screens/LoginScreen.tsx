import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ViewIcon, ViewOffIcon, Globe02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';

type AuthMode = 'login' | 'register';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!restaurantName.trim() || !fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all registration fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        restaurantName: restaurantName.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      navigate('/admin', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:grid lg:grid-cols-2 font-sans antialiased text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* Left Column: Auth Forms */}
      <div className="w-full min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-14 xl:p-20 bg-white">
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-lemonade text-3xl sm:text-4xl tracking-tight text-stone-950 select-none"
              style={{ fontFamily: "'Lemonade', 'Lemonada', cursive, sans-serif" }}
            >
              rwrd
            </span>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider text-stone-500 bg-stone-100 uppercase">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-stone-400 font-medium">
              Remember your password
            </span>
            <button
              type="button"
              className="px-3 py-1 rounded-lg text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 transition-colors"
              onClick={() => {}}
            >
              Save
            </button>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-6">
          {/* Squircle Lock Icon matching the uploaded inspiration */}
          <div className="w-11 h-11 rounded-xl bg-stone-100/90 border border-stone-200/80 shadow-sm flex items-center justify-center mx-auto mb-4 text-stone-800">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="3" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              <circle cx="9.5" cy="16" r="0.75" fill="currentColor" />
              <circle cx="12" cy="16" r="0.75" fill="currentColor" />
              <circle cx="14.5" cy="16" r="0.75" fill="currentColor" />
            </svg>
          </div>

          {/* Header Titles */}
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 text-center mb-1.5">
            {mode === 'login' ? 'Sign in to rwrd Admin' : 'Create an account'}
          </h1>
          <p className="text-xs text-stone-500 text-center mb-5">
            {mode === 'login'
              ? "You'll use this password to login to rwrd"
              : 'Set up your restaurant and primary admin account'}
          </p>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed animate-fadeIn"
            >
              {errorMessage}
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div
              role="status"
              className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium leading-relaxed animate-fadeIn"
            >
              {successMessage}
            </div>
          )}

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  >
                    <HugeiconsIcon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      className="w-3.5 h-3.5"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1.5 py-2.5 px-5 rounded-xl bg-stone-950 hover:bg-black text-white font-medium text-xs sm:text-sm transition-all shadow-sm shadow-stone-900/10 hover:shadow-md hover:shadow-stone-900/20 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3" noValidate>
              <div>
                <label
                  htmlFor="restaurantName"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Restaurant legal name
                </label>
                <input
                  id="restaurantName"
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="e.g. The Bombay Canteen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Admin full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="regEmail"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Work email
                </label>
                <input
                  id="regEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="regPassword"
                  className="block text-[11px] font-medium text-stone-600 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                  >
                    <HugeiconsIcon
                      icon={showPassword ? ViewOffIcon : ViewIcon}
                      className="w-3.5 h-3.5"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1.5 py-2.5 px-5 rounded-xl bg-stone-950 hover:bg-black text-white font-medium text-xs sm:text-sm transition-all shadow-sm shadow-stone-900/10 hover:shadow-md hover:shadow-stone-900/20 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Create restaurant account'
                )}
              </button>
            </form>
          )}

          {/* Subtle Divider */}
          <div className="flex items-center my-4 gap-2.5">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[11px] text-stone-400 font-medium">Or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Secondary Action Pill */}
          <button
            type="button"
            onClick={() => toggleMode(mode === 'login' ? 'register' : 'login')}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 font-medium text-xs transition-colors text-center"
          >
            {mode === 'login' ? 'Create a restaurant account' : 'Already have an account? Sign in'}
          </button>

          {/* Terms & Privacy Links */}
          <div className="mt-4 text-center text-[11px] text-stone-400 space-x-1.5">
            <a href="#terms" className="hover:text-stone-600 transition-colors">
              Terms of Use
            </a>
            <span>|</span>
            <a href="#privacy" className="hover:text-stone-600 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <span className="text-xs text-stone-400">© 2026 rwrd</span>

          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium px-2.5 py-1 rounded-full bg-stone-100/90 border border-stone-200/70 select-none">
            <HugeiconsIcon
              icon={Globe02Icon}
              className="w-3.5 h-3.5 text-stone-400"
              strokeWidth={1.5}
            />
            <span>ENG</span>
            <svg className="w-3 h-3 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Column: Hero Inspo Panel */}
      <div className="hidden lg:flex flex-col min-h-screen p-4 xl:p-6 bg-stone-50/40">
        <div className="w-full h-full rounded-[2.5rem] bg-gradient-to-b from-[#F6F9FE] via-[#E4EFFF] to-[#558BF6] p-10 xl:p-14 relative overflow-hidden flex flex-col justify-between shadow-sm select-none">
          {/* Value Proposition Header */}
          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
              Direct, 100% Transparent Staff Tips
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-3 leading-relaxed">
              Empower every server, bartender, and runner with instant UPI tipping from one
              intelligent platform built for modern hospitality.
            </p>
          </div>

          {/* 3D Isometric Tile Grid & Glowing Sparkle Badge */}
          <div className="absolute right-[-6%] top-[20%] w-[420px] h-[360px] pointer-events-none transform -rotate-12 -skew-y-6 scale-95 xl:scale-105 opacity-90">
            {/* Glowing Top Tile with rwrd Emblem */}
            <div className="absolute right-8 top-0 w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-2xl shadow-blue-600/50 flex items-center justify-center text-white border-t border-white/50 z-20">
              <svg
                className="w-10 h-10 text-white drop-shadow-md"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>

            {/* Translucent Frosted Glass Isometric Tiles */}
            <div className="grid grid-cols-3 gap-3.5 pt-12 pl-6">
              <div className="w-22 h-22 rounded-2xl bg-white/45 backdrop-blur-md border border-white/70 shadow-sm" />
              <div className="w-22 h-22 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-sm" />
              <div className="w-22 h-22 rounded-2xl bg-white/35 backdrop-blur-md border border-white/50 shadow-sm" />
              <div className="w-22 h-22 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-sm" />
              <div className="w-22 h-22 rounded-2xl bg-white/35 backdrop-blur-md border border-white/50 shadow-sm" />
              <div className="w-22 h-22 rounded-2xl bg-white/30 backdrop-blur-md border border-white/40 shadow-sm" />
            </div>
          </div>

          {/* Floating Live Activity Cards (Matching the screenshot bottom cards) */}
          <div className="relative z-10 space-y-3 mt-auto pt-24 max-w-md w-full">
            <div className="bg-white/45 backdrop-blur-md rounded-2xl p-4 border border-white/70 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-inner">
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900 leading-none">
                    Table 04 • Rahul V.
                  </p>
                  <p className="text-[10px] text-stone-600 mt-1">₹150 tip initiated via UPI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Done
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-inner">
                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900 leading-none">
                    Table 12 • Priya S.
                  </p>
                  <p className="text-[10px] text-stone-600 mt-1">₹250 tip initiated via UPI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Done
              </div>
            </div>

            <div className="bg-white/30 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-inner">
                  <div className="w-3.5 h-3.5 rounded-full bg-sky-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900 leading-none">
                    Floor Shift • 18 Waitstaff
                  </p>
                  <p className="text-[10px] text-stone-600 mt-1">100% direct payouts, zero fee</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-medium text-blue-900">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Live
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
