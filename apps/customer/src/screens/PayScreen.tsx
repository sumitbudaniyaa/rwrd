import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft02Icon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  CoinsSwapIcon,
} from '@hugeicons/core-free-icons';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api, ApiError } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import rwrdLogo from '../assets/rwrd.png';
import type { StaffPublic, TipIntentResponse } from '@tiptable/shared';

export const PayScreen: React.FC = () => {
  const { t } = useTranslation();
  const { staffId } = useParams<{ staffId: string }>();
  const { restaurant, token, isLoading: isRestaurantLoading } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state = location.state as { staff?: StaffPublic; amountInr?: number } | undefined;
  const stateStaff = state?.staff;
  const queryAmount = parseInt(searchParams.get('amount') || '0', 10);
  const amountInr = state?.amountInr || (queryAmount > 0 ? queryAmount : 100);

  // Fallback to fetch staff member if not passed via state
  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff', restaurant?.id],
    queryFn: () => (restaurant ? api.getStaff(restaurant.id) : Promise.reject()),
    enabled: Boolean(restaurant?.id && !stateStaff),
    staleTime: 60 * 1000,
  });

  const staff = stateStaff || staffData?.staff?.find((s) => s.id === staffId);

  const [intent, setIntent] = useState<TipIntentResponse | null>(null);
  const [isIntentLoading, setIsIntentLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const hasTriggeredRef = useRef(false);

  // Generate tip intent on screen mount and auto-trigger UPI deep link
  useEffect(() => {
    if (!token || !staff?.id || !amountInr || !restaurant?.id) return;
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const userAgent = navigator.userAgent || '';
    const deviceOs = /iPad|iPhone|iPod/.test(userAgent)
      ? 'iOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : 'Other';

    const deviceBrowser = /Chrome/.test(userAgent)
      ? 'Chrome'
      : /Safari/.test(userAgent)
        ? 'Safari'
        : /Firefox/.test(userAgent)
          ? 'Firefox'
          : 'Other';

    api
      .createTipIntent({
        token,
        staffId: staff.id,
        amountInr,
        deviceOs,
        deviceBrowser,
      })
      .then((res) => {
        setIntent(res);
        setIsIntentLoading(false);

        // Store active tip session in sessionStorage for post-return detection
        try {
          sessionStorage.setItem(
            'tiptable_active_tip',
            JSON.stringify({
              intentId: res.intentId,
              staffName: staff.displayName,
              amountInr,
              restaurantName: restaurant.name,
              timestamp: Date.now(),
            }),
          );
        } catch {
          // Ignore sessionStorage failures in private mode
        }

        // Trigger deep-link redirection to native UPI app
        window.location.href = res.upiLink;
      })
      .catch((err) => {
        setIsIntentLoading(false);
        if (err instanceof ApiError) {
          setErrorMessage(err.problem.detail || err.problem.title);
        } else {
          setErrorMessage('Could not generate payment link. Please try again.');
        }
      });
  }, [token, staff?.id, amountInr, restaurant?.id, restaurant?.name, staff?.displayName]);

  if (isRestaurantLoading || (isStaffLoading && !stateStaff) || isIntentLoading) {
    return <LoadingScreen />;
  }

  if (errorMessage || !restaurant || !staff || !amountInr) {
    return (
      <ErrorScreen
        title="Payment Error"
        message={errorMessage || 'Invalid tip session. Please select your server and amount again.'}
      />
    );
  }

  // Extract VPA from upiLink for manual copy fallback
  let vpa = '';
  if (intent?.upiLink) {
    try {
      const url = new URL(intent.upiLink);
      vpa = url.searchParams.get('pa') || '';
    } catch {
      vpa = '';
    }
  }

  const handleCopyVpa = async () => {
    if (!vpa) return;
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenAgain = () => {
    if (intent?.upiLink) {
      window.location.href = intent.upiLink;
    }
  };

  const handleDone = () => {
    navigate(`/t/${token}/thanks`, {
      state: {
        staffName: staff.displayName,
        amountInr,
        restaurantName: restaurant.name,
      },
    });
  };

  return (
    <main className="flex-1 flex flex-col justify-between p-6 max-w-[420px] mx-auto w-full">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-4">
          <button
            type="button"
            onClick={() => navigate(`/t/${token}/staff/${staff.id}`, { state: { staff } })}
            aria-label="Back to amount selection"
            className="inline-flex items-center gap-1.5 py-1.5 px-3 -ml-3 rounded-xl text-stone-700 hover:bg-stone-100 active:scale-95 transition-all text-xs font-medium cursor-pointer"
          >
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              className="w-4 h-4 text-stone-700"
              strokeWidth={1.5}
            />
            <span>{t('common.back')}</span>
          </button>

          <div className="flex items-center">
            <span className="sr-only">rwrd</span>
            <img
              src={rwrdLogo}
              alt="rwrd"
              className="h-6 sm:h-7 w-auto object-contain select-none"
            />
          </div>
        </div>

        {/* Status Prompt */}
        <section className="pt-6 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE862]/25 border border-[#FFE862]/50 text-stone-900 mx-auto flex items-center justify-center mb-4">
            <HugeiconsIcon
              icon={CoinsSwapIcon}
              className="w-8 h-8 text-stone-900 animate-pulse"
              strokeWidth={1.5}
            />
          </div>

          <h1 className="font-serif text-2xl font-normal text-stone-900 tracking-tight">
            {t('pay.opening')}
          </h1>
          <p className="mt-1 text-sm text-stone-500 font-sans">
            {t('pay.sending', { amount: amountInr, name: staff.displayName })}
          </p>
        </section>

        {/* Fallback Card for Devices / Browsers */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-stone-700 uppercase tracking-wide font-sans">
              {t('pay.fallback_title')}
            </h2>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed font-sans">
              {t('pay.fallback_desc')}
            </p>
          </div>

          {vpa && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200/60">
              <div className="truncate pr-2">
                <span className="block text-[10px] uppercase font-semibold text-stone-400 font-sans">
                  {t('pay.recipient_id')}
                </span>
                <span className="text-xs font-mono font-medium text-stone-900 truncate block">
                  {vpa}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-800 hover:bg-stone-50 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <HugeiconsIcon
                  icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                />
                <span>{copied ? t('pay.copied') : t('pay.copy_id')}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenAgain}
            className="w-full py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 transition-all shadow-2xs cursor-pointer"
          >
            {t('pay.reopen')}
          </button>
        </div>
      </div>

      {/* Done / Return Action */}
      <footer className="pt-6 pb-2 space-y-2">
        <button
          type="button"
          onClick={handleDone}
          className="w-full py-3.5 rounded-xl bg-[#FFE862] hover:bg-[#F5DE53] active:bg-[#ebd347] active:scale-[0.98] text-stone-950 text-base font-semibold transition-all shadow-xs cursor-pointer"
        >
          {t('pay.completed_btn')}
        </button>
        <p className="text-[11px] text-center text-stone-400 font-sans">{t('pay.disclaimer')}</p>
      </footer>
    </main>
  );
};
