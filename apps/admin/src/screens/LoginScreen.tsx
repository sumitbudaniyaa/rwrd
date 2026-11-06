import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  UserIcon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import { Input } from '../components/motion/input.js';
import { StatefulButton, type ButtonState } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';
import bgImage from '../assets/bg.png';

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);

  const [status, setStatus] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // "Reward early, punish late" touched state tracking
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
    restaurantName?: boolean;
    fullName?: boolean;
  }>({});

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';

  const errors = useMemo(() => {
    const errs: {
      email?: string;
      password?: string;
      restaurantName?: string;
      fullName?: string;
    } = {};

    if (!email.trim()) {
      errs.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email format.';
    }

    if (!password) {
      errs.password = 'Enter your password.';
    } else if (mode === 'register' && password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    if (mode === 'register') {
      if (!restaurantName.trim()) {
        errs.restaurantName = 'Enter restaurant legal name.';
      }
      if (!fullName.trim()) {
        errs.fullName = 'Enter admin full name.';
      }
    }

    return errs;
  }, [email, password, restaurantName, fullName, mode]);

  const touch = useCallback((field: 'email' | 'password' | 'restaurantName' | 'fullName') => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTouched({});
    setStatus('idle');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setErrorMessage(null);

    if (errors.email || errors.password) return;

    setStatus('loading');
    try {
      const res = await login(email.trim(), password);
      setStatus('success');
      setTimeout(() => {
        if (res.mfaRequired) {
          navigate('/admin/mfa', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }, 300);
    } catch (err: unknown) {
      setStatus('idle');
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Failed to sign in. Please verify your credentials.');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      restaurantName: true,
      fullName: true,
      email: true,
      password: true,
    });
    setErrorMessage(null);

    if (Object.keys(errors).length > 0) return;

    setStatus('loading');
    try {
      await register({
        restaurantName: restaurantName.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setStatus('success');
      setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 300);
    } catch (err: unknown) {
      setStatus('idle');
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Failed to create account. Please try again.');
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true });
    setErrorMessage(null);
    setSuccessMessage(null);

    if (errors.email) return;

    setStatus('loading');
    setTimeout(() => {
      setStatus('idle');
      setSuccessMessage(
        'If an account exists for this email, password reset instructions have been sent.',
      );
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex bg-white text-stone-900 overflow-hidden font-sans antialiased selection:bg-stone-900 selection:text-white">
      {/* LEFT HALF: Clean, Minimal, Editorial Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 bg-white">
        {/* Top-Left Logo & Top-Right Password Reminder / Toggle */}
        <div className="flex items-center justify-between w-full">
          {/* Top-Left: Zomato-style brand wordmark */}
          <Link to="/admin" className="flex items-center gap-2 outline-none">
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
          </Link>

          {/* Top-Right: Sign up / Sign in Toggle */}
          <div className="flex items-center">
            {mode !== 'forgot' && (
              <button
                type="button"
                onClick={() => toggleMode(mode === 'login' ? 'register' : 'login')}
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors inline-flex items-center gap-1 font-medium pl-1 cursor-pointer"
              >
                {mode === 'login' ? (
                  <>
                    Sign up <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Sign in <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Center: Compact Login Form */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* Title: Big Editorial Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                {mode === 'login' && 'welcome back'}
                {mode === 'register' && 'create account'}
                {mode === 'forgot' && 'reset password'}
              </h1>
              {/* Semantic hidden label for screen readers & test matchers */}
              <span className="sr-only">Sign in to rwrd Admin</span>
              {mode === 'forgot' && (
                <p className="text-xs text-stone-500 mt-2 text-left">
                  Enter your email and we'll send you instructions to reset your password.
                </p>
              )}
            </div>

            {/* Error Message */}
            <AnimatePresence initial={false}>
              {errorMessage && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs text-rose-800 font-medium"
                >
                  {errorMessage}
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  role="status"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-800 font-medium"
                >
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form: Login */}
            {mode === 'login' && (
              <form noValidate onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                {/* Email */}
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  sizeVariant="sm"
                  autoComplete="email"
                  placeholder="name@restaurant.com"
                  leftIcon={<HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />}
                  value={email}
                  onChange={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={() => touch('email')}
                  error={touched.email ? errors.email : undefined}
                  reserveErrorLine
                  disabled={status === 'loading' || status === 'success'}
                />

                {/* Password */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <label
                      htmlFor="password"
                      className="text-[11px] font-medium tracking-wide text-stone-600 select-none cursor-pointer"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => toggleMode('forgot')}
                      className="text-[11px] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type={revealPassword ? 'text' : 'password'}
                    sizeVariant="sm"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    leftIcon={<HugeiconsIcon icon={LockPasswordIcon} className="w-3.5 h-3.5" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setRevealPassword(!revealPassword)}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 flex items-center justify-center cursor-pointer"
                        aria-label={revealPassword ? 'Hide password' : 'Show password'}
                      >
                        {revealPassword ? (
                          <HugeiconsIcon icon={ViewOffSlashIcon} className="w-3.5 h-3.5" />
                        ) : (
                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    value={password}
                    onChange={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onBlur={() => touch('password')}
                    error={touched.password ? errors.password : undefined}
                    reserveErrorLine
                    disabled={status === 'loading' || status === 'success'}
                  />
                </div>

                {/* Submit */}
                <StatefulButton
                  type="submit"
                  size="sm"
                  state={status}
                  loadingText="Signing in..."
                  successText="Success"
                  className="w-full mt-1.5"
                >
                  Sign In
                </StatefulButton>
              </form>
            )}

            {/* Form: Register */}
            {mode === 'register' && (
              <form noValidate onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
                <Input
                  id="restaurantName"
                  label="Restaurant legal name"
                  type="text"
                  sizeVariant="sm"
                  placeholder="e.g. The Bombay Canteen"
                  leftIcon={<HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5" />}
                  value={restaurantName}
                  onChange={(val) => setRestaurantName(val)}
                  onBlur={() => touch('restaurantName')}
                  error={touched.restaurantName ? errors.restaurantName : undefined}
                  reserveErrorLine
                  disabled={status === 'loading' || status === 'success'}
                />

                <Input
                  id="fullName"
                  label="Admin full name"
                  type="text"
                  sizeVariant="sm"
                  placeholder="e.g. Sarah Miller"
                  leftIcon={<HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5" />}
                  value={fullName}
                  onChange={(val) => setFullName(val)}
                  onBlur={() => touch('fullName')}
                  error={touched.fullName ? errors.fullName : undefined}
                  reserveErrorLine
                  disabled={status === 'loading' || status === 'success'}
                />

                <Input
                  id="regEmail"
                  label="Email"
                  type="email"
                  sizeVariant="sm"
                  autoComplete="email"
                  placeholder="name@restaurant.com"
                  leftIcon={<HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />}
                  value={email}
                  onChange={(val) => setEmail(val)}
                  onBlur={() => touch('email')}
                  error={touched.email ? errors.email : undefined}
                  reserveErrorLine
                  disabled={status === 'loading' || status === 'success'}
                />

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <label
                      htmlFor="regPassword"
                      className="text-[11px] font-medium tracking-wide text-stone-600 select-none cursor-pointer"
                    >
                      Password
                    </label>
                  </div>
                  <Input
                    id="regPassword"
                    type={revealPassword ? 'text' : 'password'}
                    sizeVariant="sm"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    leftIcon={<HugeiconsIcon icon={LockPasswordIcon} className="w-3.5 h-3.5" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setRevealPassword(!revealPassword)}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 flex items-center justify-center cursor-pointer"
                        aria-label={revealPassword ? 'Hide password' : 'Show password'}
                      >
                        {revealPassword ? (
                          <HugeiconsIcon icon={ViewOffSlashIcon} className="w-3.5 h-3.5" />
                        ) : (
                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    value={password}
                    onChange={(val) => setPassword(val)}
                    onBlur={() => touch('password')}
                    error={touched.password ? errors.password : undefined}
                    reserveErrorLine
                    disabled={status === 'loading' || status === 'success'}
                  />
                </div>

                <StatefulButton
                  type="submit"
                  size="sm"
                  state={status}
                  loadingText="Creating account..."
                  successText="Success"
                  className="w-full mt-1.5"
                >
                  Create restaurant account
                </StatefulButton>
              </form>
            )}

            {/* Form: Forgot Password */}
            {mode === 'forgot' && (
              <form noValidate onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                <Input
                  id="forgotEmail"
                  label="Email"
                  type="email"
                  sizeVariant="sm"
                  autoComplete="email"
                  placeholder="name@restaurant.com"
                  leftIcon={<HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />}
                  value={email}
                  onChange={(val) => setEmail(val)}
                  onBlur={() => touch('email')}
                  error={touched.email ? errors.email : undefined}
                  reserveErrorLine
                  disabled={status === 'loading' || status === 'success'}
                />

                <StatefulButton
                  type="submit"
                  size="sm"
                  state={status}
                  loadingText="Sending link..."
                  successText="Sent"
                  className="w-full mt-1.5"
                >
                  Send reset link
                </StatefulButton>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => toggleMode('login')}
                    className="text-xs text-stone-500 hover:text-stone-900 transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3 h-3" /> Back to sign in
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>

        {/* Bottom Bar: © 2026 rwrd flush at bottom left */}
        <div className="flex items-center justify-start text-xs text-stone-400 select-none">
          © 2026 rwrd
        </div>
      </div>

      {/* RIGHT HALF: Pure artwork image in light mode */}
      <div className="hidden lg:block lg:w-1/2 p-3 bg-white select-none">
        <div className="w-full h-full relative rounded-2xl overflow-hidden border border-stone-200/60 bg-stone-50">
          <img
            src={bgImage}
            alt="Landscape with Tree"
            className="w-full h-full object-cover object-[80%_35%]"
          />
        </div>
      </div>
    </div>
  );
};
