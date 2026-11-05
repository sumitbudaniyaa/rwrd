import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.js';

interface TipSessionState {
  staffName?: string | undefined;
  amountInr?: number | undefined;
  restaurantName?: string | undefined;
}

export const ThanksScreen: React.FC = () => {
  const { t } = useTranslation();
  const { restaurant, token, isLoading, isError } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as TipSessionState | undefined) || {};

  const sessionData = React.useMemo(() => {
    let name = state.staffName;
    let amt = state.amountInr;

    try {
      const saved = sessionStorage.getItem('tiptable_active_tip');
      if (saved) {
        const parsed = JSON.parse(saved);
        name = name ?? parsed.staffName;
        amt = amt ?? parsed.amountInr;
      }
    } catch {
      // Ignore
    }
    return { staffName: name, amountInr: amt };
  }, [state.staffName, state.amountInr]);

  const staffName = sessionData.staffName;
  const amountInr = sessionData.amountInr;

  // Clear active tip state so it doesn't repeatedly auto-redirect
  useEffect(() => {
    try {
      sessionStorage.removeItem('tiptable_active_tip');
    } catch {
      // Ignore
    }
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !restaurant) {
    return <ErrorScreen />;
  }

  const handleReviewClick = () => {
    // Record telemetry with source 'post_tip_reminder'
    api
      .trackReviewTap(restaurant.id, {
        token,
        source: 'post_tip_reminder',
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Post-tip review tap telemetry failed', err);
      });

    // Open Google Review URL directly
    window.open(restaurant.googleReviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleHomeClick = () => {
    navigate(`/t/${token}`);
  };

  return (
    <main className="flex-1 flex flex-col justify-between p-6 max-w-[420px] mx-auto w-full text-center">
      {/* Top Header Branding & Language Switcher */}
      <div>
        <div className="w-full flex justify-end pb-1">
          <LanguageSwitcher />
        </div>
        <header className="pt-2 flex flex-col items-center">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-14 h-14 rounded-full object-cover shadow-sm mb-2 border border-cream-200"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center text-charcoal-700 font-serif text-xl font-medium mb-2 border border-cream-300">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <h2 className="text-xs font-medium tracking-wide uppercase text-charcoal-400">
            {restaurant.name}
          </h2>
        </header>
      </div>

      {/* Main Appreciation Card */}
      <section className="my-auto py-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-sm">
          <svg
            className="w-9 h-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-charcoal-900 tracking-tight leading-tight">
          {t('thanks.title')}
        </h1>

        <p className="mt-3 text-sm text-charcoal-600 font-sans max-w-xs leading-relaxed">
          {t('thanks.desc')}
        </p>

        {staffName && amountInr && (
          <div className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cream-200/80 text-xs text-charcoal-700 font-medium">
            <span>{t('thanks.tip_initiated', { name: staffName })}</span>
            <span>•</span>
            <span className="font-semibold">₹{amountInr}</span>
          </div>
        )}
      </section>

      {/* Google Review Prompt Card */}
      <section className="pb-4 space-y-3">
        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-sm text-left">
          <div className="flex items-center gap-1.5 text-amber-500 mb-2">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          <h3 className="font-serif text-base font-medium text-charcoal-900 leading-snug">
            {t('thanks.review_title')}
          </h3>
          <p className="mt-1 text-xs text-charcoal-500 font-sans leading-relaxed">
            {t('thanks.review_desc')}
          </p>

          <button
            type="button"
            onClick={handleReviewClick}
            className="mt-3.5 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white text-xs font-semibold tracking-wide transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center justify-center gap-1.5"
          >
            <span>{t('thanks.review_btn')}</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={handleHomeClick}
          className="w-full py-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-medium text-charcoal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          {t('thanks.home_btn')}
        </button>
      </section>

      {/* Footer */}
      <footer className="pt-2 pb-2">
        <p className="text-[11px] text-charcoal-400">{t('thanks.footer')}</p>
      </footer>
    </main>
  );
};
