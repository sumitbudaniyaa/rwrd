import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api, ApiError } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import type { StaffPublic, TipIntentResponse } from '@tiptable/shared';

export const PayScreen: React.FC = () => {
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
    retry: false,
  });

  const staff = stateStaff || staffData?.staff?.find((s) => s.id === staffId);

  const [intent, setIntent] = useState<TipIntentResponse | null>(null);
  const [isIntentLoading, setIsIntentLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const intentCreatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!staff || !amountInr || !token || !restaurant || intentCreatedRef.current) {
      return;
    }

    intentCreatedRef.current = true;

    // Detect coarse platform
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
          setErrorMessage('Failed to create tip intent. Please try again.');
        }
      });
  }, [staff, amountInr, token, restaurant]);

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
            className="inline-flex items-center gap-1.5 py-2 px-3 -ml-3 rounded-full text-charcoal-700 hover:bg-cream-200/70 active:scale-95 transition-all text-xs font-medium focus-visible:ring-2 focus-visible:ring-brand-accent focus:outline-none"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span>Back</span>
          </button>

          <span className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">
            {restaurant.name}
          </span>
        </div>

        {/* Status Prompt */}
        <section className="pt-6 pb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100/70 text-emerald-700 mx-auto flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 animate-pulse"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
          </div>

          <h1 className="font-serif text-2xl font-normal text-charcoal-900 tracking-tight">
            Opening your UPI app...
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 font-sans">
            Sending <span className="font-semibold text-charcoal-800">₹{amountInr}</span> to{' '}
            <span className="font-semibold text-charcoal-800">{staff.displayName}</span>
          </p>
        </section>

        {/* Fallback Card for Devices / Browsers */}
        <div className="p-5 rounded-2xl bg-white border border-cream-300 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wide">
              UPI App Didn&apos;t Open?
            </h2>
            <p className="mt-1 text-xs text-charcoal-500 leading-relaxed font-sans">
              You can reopen your UPI app or copy the recipient&apos;s UPI ID to pay manually from
              Google Pay, PhonePe, Paytm, or BHIM.
            </p>
          </div>

          {vpa && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-cream-100 border border-cream-200">
              <div className="truncate pr-2">
                <span className="block text-[10px] uppercase font-semibold text-charcoal-400">
                  Recipient UPI ID
                </span>
                <span className="text-xs font-mono font-medium text-charcoal-800 truncate block">
                  {vpa}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-cream-300 text-xs font-medium text-charcoal-800 hover:bg-cream-50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {copied ? '✓ Copied' : 'Copy ID'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenAgain}
            className="w-full py-2.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-medium text-charcoal-800 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            Try Opening UPI App Again
          </button>
        </div>
      </div>

      {/* Done / Return Action */}
      <footer className="pt-6 pb-2 space-y-2">
        <button
          type="button"
          onClick={handleDone}
          className="w-full py-4 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 active:scale-[0.99] text-white text-base font-medium transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          I have completed payment
        </button>
        <p className="text-[11px] text-center text-charcoal-400">
          TipTable never touches your funds • Direct peer-to-peer UPI transfer
        </p>
      </footer>
    </main>
  );
};
