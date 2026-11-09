import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  Store01Icon,
  QrCodeIcon,
  Shield01Icon,
  Tick01Icon,
  Logout01Icon,
  Wallet01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { FadeIn, SlideUp } from '@tiptable/ui';
import { StatefulButton, type ButtonState } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, setAccessToken, type BillingPlanItem, ApiError } from '../services/api.js';
import logoImage from '../assets/logo.png';

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
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex-1 flex flex-col items-center">
        <FadeIn>
          <div className="text-center max-w-xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE862]/30 border border-[#FFE862]/60 text-[11px] font-semibold text-stone-900">
              <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" />
              <span>Mandatory Plan Activation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
              activate your establishment
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
              Select your subscription tier to unlock live table QR placard generation,
              direct-to-server guest tipping, and multi-period performance analytics.
            </p>
          </div>
        </FadeIn>

        {/* Pricing Cards Grid */}
        <div className="w-full mt-8">
          {isLoadingPlans ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SlideUp delay={100}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activePlanList.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const monthlyEquivalent = Math.round(plan.priceInr / plan.durationMonths);
                  const isYearly = plan.durationMonths === 12;
                  const isSemi = plan.durationMonths === 6;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-white border-stone-900 shadow-md ring-2 ring-stone-900/10'
                          : 'bg-white/70 border-stone-200 hover:border-stone-300 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Badge if Popular or Best Value */}
                      {(isYearly || isSemi) && (
                        <div
                          className={`absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight shadow-2xs ${
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
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-stone-900">{plan.name}</h3>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-stone-900 bg-stone-900 text-white'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <HugeiconsIcon icon={Tick01Icon} className="w-2.5 h-2.5" />
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold tracking-tight text-stone-900">
                              ₹{plan.priceInr}
                            </span>
                            <span className="text-[11px] text-stone-500 font-normal">total</span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            ₹{monthlyEquivalent}/month billing
                          </p>
                        </div>

                        {/* Core Invariants Included */}
                        <div className="space-y-2 border-t border-stone-100 pt-3 text-[11px] text-stone-600">
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                            />
                            <span>Unlimited tables & QRs</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                            />
                            <span>Zero tip fund custody</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                            />
                            <span>Staff shifts & VPA routing</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                            />
                            <span>48h plan grace window</span>
                          </div>
                        </div>
                      </div>

                      {/* Select Pill */}
                      <button
                        type="button"
                        className={`w-full mt-5 py-1.5 px-3 rounded-xl text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Choose Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </SlideUp>
          )}
        </div>

        {/* Action Callout */}
        {currentPlan && (
          <FadeIn delay={200}>
            <div className="w-full max-w-xl mx-auto mt-8 p-4 bg-white rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-xs font-semibold text-stone-900">
                  {currentPlan.name} Plan Selected — ₹{currentPlan.priceInr} INR
                </p>
                <p className="text-[11px] text-stone-500">
                  Instant activation via UPI deep link or standard checkout.
                </p>
              </div>

              <StatefulButton
                state="idle"
                onClick={handleOpenPayment}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-[0.98]"
              >
                <span>Proceed to Pay</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
              </StatefulButton>
            </div>
          </FadeIn>
        )}

        {/* Operational Invariants Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full mt-12 pt-8 border-t border-stone-200/70 text-center sm:text-left">
          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 mx-auto sm:mx-0">
              <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900">Instant QR Placards</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Export high-resolution PDF & SVG placards ready for dining table stands.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 mx-auto sm:mx-0">
              <HugeiconsIcon icon={Wallet01Icon} className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900">Direct Staff UPI</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Dinners tip directly to waitstaff UPI accounts with zero intermediate escrow.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 mx-auto sm:mx-0">
              <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900">48-Hour Grace Protection</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Keep table operations smooth with an automatic 2-day buffer upon renewal dates.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-stone-200/60 text-[11px] text-stone-400">
        rwrd platform — Authorized establishment billing and credentialing
      </footer>

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
