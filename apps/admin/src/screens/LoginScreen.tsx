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
  Location01Icon,
  Globe02Icon,
} from '@hugeicons/core-free-icons';
import { Input } from '../components/motion/input.js';
import { StatefulButton, type ButtonState } from '../components/motion/button.js';
import { SharedLayoutBg } from '../components/motion/shared-layout-bg.js';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';
import bgImage from '../assets/bg.png';
import logoImage from '../assets/logo.png';

type AuthMode = 'login' | 'register' | 'forgot';
type OnboardStep = 1 | 2 | 3;

interface EstablishmentType {
  id: string;
  label: string;
}

const establishmentTypes: EstablishmentType[] = [
  { id: 'RESTAURANT', label: 'A. Restaurant / Dining' },
  { id: 'BAR', label: 'B. Bar / Pub / Brewery' },
  { id: 'CAFE', label: 'C. Cafe / Quick Service' },
];

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<OnboardStep>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');

  // Password visibility
  const [revealPassword, setRevealPassword] = useState(false);
  const [revealConfirmPassword, setRevealConfirmPassword] = useState(false);

  // Status and feedback
  const [status, setStatus] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // "Reward early, punish late" touched state tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};

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
      if (!confirmPassword) {
        errs.confirmPassword = 'Confirm your password.';
      } else if (confirmPassword !== password) {
        errs.confirmPassword = 'Passwords do not match.';
      }

      if (!restaurantName.trim()) {
        errs.restaurantName = 'Enter restaurant legal name.';
      }
      if (!fullName.trim()) {
        errs.fullName = 'Enter admin full name.';
      }
    }

    return errs;
  }, [email, password, confirmPassword, restaurantName, fullName, mode]);

  const touch = useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep(1);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTouched({});
    setStatus('idle');
  };

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setTimeout(() => {
      setStep(3);
    }, 150);
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
      confirmPassword: true,
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
      {/* LEFT HALF: Clean, Minimal, Editorial Form / Multi-step Onboarding */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 bg-white overflow-y-auto">
        {/* Top-Left Logo & Top-Right Toggle */}
        <div className="flex items-center justify-between w-full shrink-0">
          {/* Top-Left: rwrd brand logo */}
          <Link to="/admin" className="flex items-center gap-2 outline-none group">
            <span className="sr-only">rwrd</span>
            <img
              src={logoImage}
              alt="rwrd"
              className="h-8 sm:h-9 w-auto object-contain select-none transition-transform group-hover:scale-[1.02]"
            />
            <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider text-stone-500 bg-stone-100 uppercase border border-stone-200/60">
              Admin
            </span>
          </Link>

          {/* Top-Right: Sign up / Sign in toggle link */}
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

        {/* Center: Dynamic Auth / Onboarding Form */}
        <div className="w-full max-w-md mx-auto my-auto py-6">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                    welcome back
                  </h1>
                  <span className="sr-only">Sign in to rwrd Admin</span>
                </div>

                {errorMessage && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs text-rose-800 font-medium"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <form noValidate onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
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
              </motion.div>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                    reset password
                  </h1>
                  <p className="text-xs text-stone-500 mt-2 text-left">
                    Enter your email and we'll send you instructions to reset your password.
                  </p>
                </div>

                {errorMessage && (
                  <motion.div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs text-rose-800 font-medium"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-800 font-medium"
                  >
                    {successMessage}
                  </motion.div>
                )}

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
              </motion.div>
            )}

            {/* ONBOARDING FLOW: STEP 1 */}
            {mode === 'register' && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-8"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                  let&apos;s onboard you
                </h1>

                <div className="flex justify-end w-full">
                  <StatefulButton
                    type="button"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="px-5"
                  >
                    <span>Next</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 ml-1" />
                  </StatefulButton>
                </div>
              </motion.div>
            )}

            {/* ONBOARDING FLOW: STEP 2 */}
            {mode === 'register' && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                  i am a...
                </h1>

                {/* beUI SharedLayoutBg with gliding background pill */}
                <div className="w-full py-1">
                  <SharedLayoutBg
                    inset={4}
                    pillClassName="bg-stone-100 rounded-xl"
                    className="flex flex-col gap-1.5 w-full"
                  >
                    {establishmentTypes.map((type) => {
                      const isSelected = selectedType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => handleSelectType(type.id)}
                          className="group w-full flex items-center px-4 py-3.5 cursor-pointer select-none transition-colors duration-150 relative rounded-xl"
                        >
                          <span
                            className={`relative z-10 text-base sm:text-lg tracking-tight transition-colors duration-150 ${
                              isSelected
                                ? 'text-stone-950 font-semibold'
                                : 'text-stone-700 group-hover:text-stone-950 font-normal'
                            }`}
                          >
                            {type.label}
                          </span>
                        </div>
                      );
                    })}
                  </SharedLayoutBg>
                </div>

                <div className="flex items-center justify-end w-full pt-3">
                  <StatefulButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="px-4"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5 mr-1" />
                    <span>Back</span>
                  </StatefulButton>
                </div>
              </motion.div>
            )}

            {/* ONBOARDING FLOW: STEP 3 */}
            {mode === 'register' && step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-5"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
                  your restaurant
                </h1>

                {errorMessage && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs text-rose-800 font-medium"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                <form noValidate onSubmit={handleRegisterSubmit} className="flex flex-col gap-2.5">
                  <Input
                    id="fullName"
                    label="Name"
                    type="text"
                    sizeVariant="sm"
                    placeholder="Full name"
                    leftIcon={<HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5" />}
                    value={fullName}
                    onChange={(val) => {
                      setFullName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onBlur={() => touch('fullName')}
                    error={touched.fullName ? errors.fullName : undefined}
                    reserveErrorLine
                    disabled={status === 'loading' || status === 'success'}
                  />

                  <Input
                    id="restaurantName"
                    label="Restaurant legal name"
                    type="text"
                    sizeVariant="sm"
                    placeholder="e.g. The Bombay Canteen"
                    leftIcon={<HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5" />}
                    value={restaurantName}
                    onChange={(val) => {
                      setRestaurantName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onBlur={() => touch('restaurantName')}
                    error={touched.restaurantName ? errors.restaurantName : undefined}
                    reserveErrorLine
                    disabled={status === 'loading' || status === 'success'}
                  />

                  {/* City, State, Country Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      id="city"
                      label="City"
                      type="text"
                      sizeVariant="sm"
                      placeholder="City"
                      leftIcon={<HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5" />}
                      value={city}
                      onChange={(val) => setCity(val)}
                      disabled={status === 'loading' || status === 'success'}
                    />

                    <Input
                      id="state"
                      label="State"
                      type="text"
                      sizeVariant="sm"
                      placeholder="State"
                      leftIcon={<HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5" />}
                      value={stateName}
                      onChange={(val) => setStateName(val)}
                      disabled={status === 'loading' || status === 'success'}
                    />

                    <Input
                      id="country"
                      label="Country"
                      type="text"
                      sizeVariant="sm"
                      placeholder="Country"
                      leftIcon={<HugeiconsIcon icon={Globe02Icon} className="w-3.5 h-3.5" />}
                      value={country}
                      onChange={(val) => setCountry(val)}
                      disabled={status === 'loading' || status === 'success'}
                    />
                  </div>

                  <Input
                    id="regEmail"
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

                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="regPassword"
                      className="text-[11px] font-medium tracking-wide text-stone-600 select-none cursor-pointer"
                    >
                      Password
                    </label>
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

                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="confirmPassword"
                      className="text-[11px] font-medium tracking-wide text-stone-600 select-none cursor-pointer"
                    >
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type={revealConfirmPassword ? 'text' : 'password'}
                      sizeVariant="sm"
                      placeholder="Confirm password"
                      leftIcon={<HugeiconsIcon icon={LockPasswordIcon} className="w-3.5 h-3.5" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setRevealConfirmPassword(!revealConfirmPassword)}
                          className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 flex items-center justify-center cursor-pointer"
                          aria-label={
                            revealConfirmPassword
                              ? 'Hide confirm password visibility'
                              : 'Show confirm password visibility'
                          }
                        >
                          {revealConfirmPassword ? (
                            <HugeiconsIcon icon={ViewOffSlashIcon} className="w-3.5 h-3.5" />
                          ) : (
                            <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                          )}
                        </button>
                      }
                      value={confirmPassword}
                      onChange={(val) => {
                        setConfirmPassword(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={() => touch('confirmPassword')}
                      error={touched.confirmPassword ? errors.confirmPassword : undefined}
                      reserveErrorLine
                      disabled={status === 'loading' || status === 'success'}
                    />
                  </div>

                  {/* Actions: Back & Onboard */}
                  <div className="flex items-center justify-between pt-2">
                    <StatefulButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(2)}
                      disabled={status === 'loading' || status === 'success'}
                      className="px-4"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5 mr-1" />
                      <span>Back</span>
                    </StatefulButton>

                    <StatefulButton
                      type="submit"
                      size="sm"
                      state={status}
                      loadingText="Onboarding..."
                      successText="Success"
                      className="px-6"
                    >
                      <span>Onboard</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 ml-1" />
                    </StatefulButton>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Bar: © 2026 rwrd flush at bottom left */}
        <div className="flex items-center justify-start text-xs text-stone-400 select-none shrink-0">
          © 2026 rwrd
        </div>
      </div>

      {/* RIGHT HALF: Pure artwork image with object-[80%_35%] ensuring right tree is visible */}
      <div className="hidden lg:block lg:w-1/2 p-3 bg-white select-none">
        <div className="w-full h-full relative rounded-2xl overflow-hidden border border-stone-200/60 bg-stone-50">
          <img
            src={bgImage}
            alt="rwrd Admin Hero Artwork"
            className="w-full h-full object-cover object-[80%_35%]"
          />
        </div>
      </div>
    </div>
  );
};
