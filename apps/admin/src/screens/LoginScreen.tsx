import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';
import { MotionButton } from '../components/motion/button.js';
import { Alert, AlertIcon, AlertDescription } from '../components/motion/alert.js';
import { ease } from '../components/motion/ease.js';

type AuthMode = 'login' | 'register' | 'forgot';

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
      setErrorMessage('Please enter both your email and password.');
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);

    // Simulate password reset dispatch with a privacy-preserving success message
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(
        'If an account exists for this email, password reset instructions have been sent.',
      );
    }, 400);
  };

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:grid lg:grid-cols-2 font-sans antialiased text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* Left Column: Auth Forms */}
      <div className="w-full min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white">
        {/* Top-Left Logo & Top-Right Password Reminder */}
        <div className="flex items-center justify-between w-full">
          {/* Top-Left: Zomato-style brand wordmark */}
          <div className="flex items-center gap-2.5">
            <span
              className="font-zomato font-black italic tracking-tighter text-3xl sm:text-4xl text-stone-950 select-none lowercase leading-none"
              style={{
                fontFamily: "'Montserrat', 'Poppins', 'Inter', sans-serif",
                fontStyle: 'italic',
                fontWeight: 900,
                letterSpacing: '-0.06em',
              }}
            >
              rwrd
            </span>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider text-stone-500 bg-stone-100 uppercase">
              Admin
            </span>
          </div>

          {/* Top-Right: Remember password reminder */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-stone-400 font-medium">
              Remember your password
            </span>
            <MotionButton type="button" variant="secondary" size="sm" onClick={() => {}}>
              Save
            </MotionButton>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease }}
            >
              {/* Header Titles */}
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 text-center mb-1.5">
                {mode === 'login' && 'Sign in to rwrd Admin'}
                {mode === 'register' && 'Create an account'}
                {mode === 'forgot' && 'Reset your password'}
              </h1>
              {mode !== 'login' && (
                <p className="text-xs text-stone-500 text-center mb-5">
                  {mode === 'register'
                    ? 'Set up your restaurant and primary admin account'
                    : "Enter your email and we'll send you instructions to reset your password."}
                </p>
              )}
              {mode === 'login' && <div className="mb-4" />}

              {/* beUI Animated Alerts */}
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertIcon variant="destructive" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert variant="success" className="mb-4">
                  <AlertIcon variant="success" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {/* Login Form */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3" noValidate>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[11px] font-medium text-stone-600 mb-1"
                    >
                      Email
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
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="password"
                        className="block text-[11px] font-medium text-stone-600"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleMode('forgot')}
                        className="text-[11px] text-stone-500 hover:text-stone-900 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
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

                  <MotionButton
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    className="w-full mt-1.5"
                  >
                    Sign in
                  </MotionButton>
                </form>
              )}

              {/* Registration Form */}
              {mode === 'register' && (
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
                      Email
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

                  <MotionButton
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    className="w-full mt-1.5"
                  >
                    Create restaurant account
                  </MotionButton>
                </form>
              )}

              {/* Forgot Password Form */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="space-y-3" noValidate>
                  <div>
                    <label
                      htmlFor="forgotEmail"
                      className="block text-[11px] font-medium text-stone-600 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="forgotEmail"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@restaurant.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50/80 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all"
                    />
                  </div>

                  <MotionButton
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    className="w-full mt-1.5"
                  >
                    Send reset link
                  </MotionButton>
                </form>
              )}

              {/* Mode Toggle Controls */}
              {mode !== 'forgot' ? (
                <>
                  <div className="flex items-center my-4 gap-2.5">
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-[11px] text-stone-400 font-medium">Or</span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>

                  <MotionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => toggleMode(mode === 'login' ? 'register' : 'login')}
                    className="w-full"
                  >
                    {mode === 'login'
                      ? 'Create a restaurant account'
                      : 'Already have an account? Sign in'}
                  </MotionButton>
                </>
              ) : (
                <div className="mt-4">
                  <MotionButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => toggleMode('login')}
                    className="w-full"
                  >
                    Back to sign in
                  </MotionButton>
                </div>
              )}

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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom-Left: © 2026 rwrd flush at corner with no divider line */}
        <div className="flex items-center justify-start w-full">
          <span className="text-xs text-stone-400">© 2026 rwrd</span>
        </div>
      </div>

      {/* Right Column: Hero Showcase Panel (Transactions Stack Removed) */}
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
        </div>
      </div>
    </div>
  );
};
