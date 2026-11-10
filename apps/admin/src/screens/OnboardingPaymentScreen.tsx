import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  Store01Icon,
  Tick01Icon,
  Logout01Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { FadeIn, SlideUp } from '@tiptable/ui';
import { StatefulButton, type ButtonState } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, setAccessToken, type BillingPlanItem, ApiError } from '../services/api.js';
import logoImage from '../assets/logo.png';

const TAB_SPRING = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 0.8,
} as const;

interface FallbackPlan {
  id: string;
  name: string;
  code: string;
  priceInr: number;
  durationMonths: number;
  badge?: string;
  savings?: string;
}

const DEFAULT_PLANS: FallbackPlan[] = [
  {
    id: 'plan-1m',
    name: '1 Month',
    code: 'monthly',
    priceInr: 99,
    durationMonths: 1,
  },
  {
    id: 'plan-3m',
    name: '3 Months',
    code: 'quarterly',
    priceInr: 269,
    durationMonths: 3,
    savings: 'Save 10%',
  },
  {
    id: 'plan-6m',
    name: '6 Months',
    code: 'semi_annual',
    priceInr: 549,
    durationMonths: 6,
    badge: 'Popular',
  },
  {
    id: 'plan-12m',
    name: '12 Months',
    code: 'yearly',
    priceInr: 1029,
    durationMonths: 12,
    badge: 'Best Value',
    savings: 'Save 15%',
  },
];

export const OnboardingPaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, restaurant, logout, refreshUser } = useAuth();

  const [plans, setPlans] = useState<BillingPlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch active SaaS tiers from backend
  useEffect(() => {
    let mounted = true;
    async function loadPlans() {
      try {
        const res = await api.getBillingPlans();
        if (mounted && res.plans && res.plans.length > 0) {
          setPlans(res.plans);
          // Default to the 6m or 1m plan
          const defaultPick = res.plans.find((p) => p.durationMonths === 6) || res.plans[0];
          if (defaultPick) setSelectedPlanId(defaultPick.id);
        }
      } catch {
        // Fallback to static pricing structure if network/API drops
        if (mounted) {
          setPlans(
            DEFAULT_PLANS.map((p) => ({
              ...p,
              monthlyFeeInr: Math.round(p.priceInr / p.durationMonths),
            })),
          );
          setSelectedPlanId(DEFAULT_PLANS[1]?.id || DEFAULT_PLANS[0]!.id);
        }
      } finally {
        if (mounted) setIsLoadingPlans(false);
      }
    }
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  const activePlanList = plans.length > 0 ? plans : DEFAULT_PLANS;
  const currentPlan = activePlanList.find((p) => p.id === selectedPlanId) || activePlanList[0];

  const handleOpenPayment = () => {
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!currentPlan) return;
    setPaymentStatus('loading');
    setErrorMessage(null);

    try {
      const res = await api.completeOnboardingPayment(currentPlan.id);
      if (res.accessToken) {
        setAccessToken(res.accessToken);
      }
      await refreshUser?.();
      setPaymentStatus('success');
      setTimeout(() => {
        setIsModalOpen(false);
        navigate('/', { replace: true });
      }, 700);
    } catch (err) {
      setPaymentStatus('idle');
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || err.problem.title);
      } else {
        setErrorMessage('Failed to complete plan payment. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 font-sans flex flex-col justify-between selection:bg-[#FFE862]/40">
      {/* Top Bar */}
      <header className="w-full border-b border-stone-200/80 bg-white/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="rwrd logo" className="h-7 w-auto object-contain" />
          <div className="h-4 w-px bg-stone-200" />
          <span className="text-xs font-medium text-stone-500 tracking-tight">
            Establishment Onboarding
          </span>
        </div>

        <div className="flex items-center gap-3">
          {restaurant?.name && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full border border-stone-200/60 text-xs font-medium text-stone-700">
              <HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5 text-stone-500" />
              <span>{restaurant.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 pb-28 flex-1 flex flex-col items-center">
        <FadeIn>
          <div className="text-center max-w-xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
              activate your establishment
            </h1>
          </div>
        </FadeIn>

        {/* beUI Segmented Tabs Selector */}
        {!isLoadingPlans && activePlanList.length > 0 && (
          <FadeIn delay={40}>
            <div className="flex items-center justify-center mt-7">
              <div
                role="tablist"
                aria-label="Subscription billing duration"
                className="inline-flex items-center p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200/80 shadow-2xs max-w-full overflow-x-auto"
              >
                {activePlanList.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isYearly = plan.durationMonths === 12;
                  const isSemi = plan.durationMonths === 6;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer select-none outline-none focus:outline-none whitespace-nowrap ${
                        isSelected ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="beui-plan-tab-active-pill"
                          className="absolute inset-0 bg-white rounded-xl shadow-xs border border-stone-200/60"
                          transition={TAB_SPRING}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span>{plan.name}</span>
                        {isSemi && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#FFE862] text-stone-900 border border-amber-300">
                            Popular
                          </span>
                        )}
                        {isYearly && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-900 text-white">
                            Save 15%
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Pricing Cards Grid */}
        <div className="w-full mt-8">
          {isLoadingPlans ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SlideUp delay={100}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {activePlanList.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const monthlyEquivalent = Math.round(plan.priceInr / plan.durationMonths);
                  const isYearly = plan.durationMonths === 12;
                  const isSemi = plan.durationMonths === 6;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border transition-all duration-300 ease-out cursor-pointer ${
                        isSelected
                          ? 'bg-white border-stone-900 shadow-lg scale-[1.01]'
                          : 'bg-white/80 border-stone-200 hover:border-stone-300 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* beUI Smooth Active Card Highlight */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute -inset-[2px] rounded-[18px] border-2 border-stone-900 ring-4 ring-stone-900/10 pointer-events-none z-10"
                          />
                        )}
                      </AnimatePresence>

                      {/* Badge if Popular or Best Value */}
                      {(isYearly || isSemi) && (
                        <div
                          className={`absolute -top-3 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-tight shadow-2xs z-20 ${
                            isYearly
                              ? 'bg-stone-900 text-white'
                              : 'bg-[#FFE862] text-stone-900 border border-amber-300'
                          }`}
                        >
                          {isYearly ? 'Best Value (15% Off)' : 'Popular (6 Mos)'}
                        </div>
                      )}

                      <div>
                        {/* Radio Selector & Plan Name */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base sm:text-lg font-bold text-stone-900">
                            {plan.name}
                          </h3>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-stone-900 bg-stone-900 text-white'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && <HugeiconsIcon icon={Tick01Icon} className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-stone-900">
                              ₹{plan.priceInr}
                            </span>
                            <span className="text-xs text-stone-500 font-medium">total</span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1 font-medium">
                            ₹{monthlyEquivalent}/month billing
                          </p>
                        </div>

                        {/* Core Invariants Included */}
                        <div className="space-y-2.5 border-t border-stone-100 pt-4 text-xs text-stone-600">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-4 h-4 text-emerald-600 shrink-0"
                            />
                            <span>Unlimited tables & QRs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-4 h-4 text-emerald-600 shrink-0"
                            />
                            <span>Zero tip fund custody</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-4 h-4 text-emerald-600 shrink-0"
                            />
                            <span>Staff shifts & VPA routing</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-4 h-4 text-emerald-600 shrink-0"
                            />
                            <span>48h plan grace window</span>
                          </div>
                        </div>
                      </div>

                      {/* Select Pill */}
                      <button
                        type="button"
                        className={`w-full mt-6 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>{isSelected ? 'Selected' : 'Choose Plan'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </SlideUp>
          )}
        </div>

        {/* Sticky Selected Plan Floating Bar */}
        {currentPlan && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-none">
            <SlideUp delay={50}>
              <div className="pointer-events-auto px-5 py-3.5 sm:px-6 sm:py-3.5 rounded-2xl bg-stone-900/95 backdrop-blur-md border border-stone-800 shadow-2xl shadow-stone-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300">
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                    <span>{currentPlan.name} Plan Selected &mdash;</span>
                    <span className="text-[#FFE862] font-mono font-bold text-sm sm:text-base">
                      ₹{currentPlan.priceInr} INR
                    </span>
                  </p>
                </div>

                <StatefulButton
                  state="idle"
                  onClick={handleOpenPayment}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FFE862] hover:bg-[#FADC32] text-stone-900 text-xs font-bold shadow-sm flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <span>Proceed to Pay</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                </StatefulButton>
              </div>
            </SlideUp>
          </div>
        )}
      </main>

      {/* Payment Simulation & Checkout Modal */}
      {isModalOpen &&
        currentPlan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fade-in font-sans">
            <FadeIn>
              <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200/90 shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center">
                      <HugeiconsIcon icon={Wallet01Icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">
                        Complete Plan Payment
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {currentPlan.name} Subscription Tier
                      </p>
                    </div>
                  </div>

                  <span className="text-base font-bold text-stone-900">
                    ₹{currentPlan.priceInr}
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {errorMessage}
                  </div>
                )}

                {/* Simulated Payment Gateway / UPI Interface */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Billed To</span>
                    <span className="font-semibold text-stone-900">
                      {restaurant?.name || user?.fullName || 'Registered Admin'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Payment Method</span>
                    <span className="font-semibold text-stone-900 flex items-center gap-1">
                      <span>Standard UPI Deep Link</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Active Duration</span>
                    <span className="font-semibold text-stone-900">
                      {currentPlan.durationMonths} Month{currentPlan.durationMonths > 1 ? 's' : ''}{' '}
                      (+ 48h grace)
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-stone-200/60 text-[11px] text-stone-600 text-center">
                    Simulating instant UPI payment response. In production, this completes via
                    integrated checkout intent.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={paymentStatus === 'loading'}
                    className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <StatefulButton
                    state={paymentStatus}
                    onClick={handleConfirmPayment}
                    className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-black rounded-xl shadow-2xs transition-all"
                  >
                    Confirm & Activate
                  </StatefulButton>
                </div>
              </div>
            </FadeIn>
          </div>,
          document.body,
        )}
    </div>
  );
};
