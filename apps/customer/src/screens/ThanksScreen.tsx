import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, StarIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import rwrdLogo from '../assets/rwrd.png';

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
      {/* Top Header Branding: Restaurant Logo on Left, Name on Right */}
      <header className="pt-2 pb-4 flex items-center justify-between w-full text-left">
        <div className="flex items-center flex-shrink-0">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="max-h-11 max-w-[120px] w-auto h-auto object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-serif text-lg font-medium border border-stone-200">
              {restaurant.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end text-right pl-3 truncate">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-stone-700 font-sans truncate max-w-[220px]">
            {restaurant.name}
          </h2>
        </div>
      </header>

      {/* Main Appreciation Card */}
      <section className="my-auto py-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FFE862]/30 border border-[#FFE862]/60 text-stone-900 flex items-center justify-center mb-6 shadow-2xs">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="w-8 h-8 text-stone-900"
            strokeWidth={1.5}
          />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight leading-tight">
          {t('thanks.title')}
        </h1>

        <p className="mt-3 text-sm text-stone-600 font-sans max-w-xs leading-relaxed">
          {t('thanks.desc')}
        </p>

        {staffName && amountInr && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200/60 text-xs text-stone-800 font-medium font-sans">
            <span>{t('thanks.tip_initiated', { name: staffName })}</span>
            <span>•</span>
            <span className="font-semibold">₹{amountInr}</span>
          </div>
        )}
      </section>

      {/* Google Review Prompt Card */}
      <section className="pb-4 space-y-3">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-left">
          <div className="flex items-center gap-1 text-amber-400 mb-2">
            {[...Array(5)].map((_, i) => (
              <HugeiconsIcon
                key={i}
                icon={StarIcon}
                className="w-4 h-4 fill-amber-400 text-amber-400"
                strokeWidth={1.5}
              />
            ))}
          </div>

          <h3 className="font-serif text-base font-medium text-stone-900 leading-snug">
            {t('thanks.review_title')}
          </h3>
          <p className="mt-1 text-xs text-stone-500 font-sans leading-relaxed">
            {t('thanks.review_desc')}
          </p>

          <button
            type="button"
            onClick={handleReviewClick}
            className="mt-3.5 w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{t('thanks.review_btn')}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleHomeClick}
          className="w-full py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-all shadow-2xs cursor-pointer"
        >
          {t('thanks.home_btn')}
        </button>
      </section>

      {/* Footer: Official rwrd Brand Logo */}
      <footer className="text-center pt-3 pb-2">
        <span className="sr-only">rwrd</span>
        <img
          src={rwrdLogo}
          alt="rwrd"
          className="h-8 sm:h-9 w-auto object-contain mx-auto select-none"
        />
      </footer>
    </main>
  );
};
