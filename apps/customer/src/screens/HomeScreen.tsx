import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import { api } from '../services/api.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.js';

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { restaurant, table, token, isLoading, isError } = useRestaurant();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !restaurant) {
    return <ErrorScreen />;
  }

  const handleReviewClick = () => {
    // Fire-and-forget telemetry for review click
    api
      .trackReviewTap(restaurant.id, {
        token,
        source: 'home_card',
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Review tap telemetry failed', err);
      });

    // Directly open Google Review URL in a new window/tab
    window.open(restaurant.googleReviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStaffClick = () => {
    navigate(`/t/${token}/staff`);
  };

  return (
    <main className="flex-1 flex flex-col justify-between p-6 max-w-[420px] mx-auto w-full">
      {/* Top Bar with Language Switcher */}
      <div className="w-full flex justify-end pb-1">
        <LanguageSwitcher />
      </div>

      {/* Header Section: Branding & Table Indicator */}
      <header className="pt-2 pb-4 flex flex-col items-center text-center">
        {restaurant.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt={restaurant.name}
            className="w-16 h-16 rounded-full object-cover shadow-sm mb-3 border border-cream-200"
            loading="eager"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center text-charcoal-700 font-serif text-2xl font-medium mb-3 border border-cream-300">
            {restaurant.name.charAt(0)}
          </div>
        )}

        <h2 className="text-sm font-medium tracking-wide uppercase text-charcoal-500">
          {restaurant.name}
        </h2>

        {table && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-200/80 text-xs text-charcoal-700 font-medium">
            <span>{table.tableNumber}</span>
            {table.section && (
              <>
                <span className="text-charcoal-400">•</span>
                <span>{table.section}</span>
              </>
            )}
          </div>
        )}
      </header>

      {/* Greeting Section: Claude-style Serif Greeting */}
      <section className="my-auto py-8 text-center">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-charcoal-900 tracking-tight leading-tight">
          {t('home.greeting')}
        </h1>
        <p className="mt-3 text-sm text-charcoal-500 font-sans max-w-xs mx-auto">
          {t('home.subtitle')}
        </p>
      </section>

      {/* Action Cards: Equal Visual Weight */}
      <section className="space-y-4 pb-4">
        {/* Card A: Make people happy */}
        <button
          type="button"
          onClick={handleStaffClick}
          className="w-full text-left p-5 rounded-2xl bg-white border border-cream-300/80 shadow-sm hover:border-brand-accent/50 active:scale-[0.99] transition-all flex items-center justify-between group min-h-[96px] focus-visible:ring-2 focus-visible:ring-brand-accent focus:outline-none"
        >
          <div className="flex items-start gap-4 pr-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6"
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
            <div>
              <h3 className="font-serif text-lg font-medium text-charcoal-900 leading-snug">
                {t('home.cardA_title')}
              </h3>
              <p className="mt-1 text-xs text-charcoal-500 leading-relaxed font-sans">
                {t('home.cardA_desc')}
              </p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Card B: Review us */}
        <button
          type="button"
          onClick={handleReviewClick}
          className="w-full text-left p-5 rounded-2xl bg-white border border-cream-300/80 shadow-sm hover:border-amber-400/50 active:scale-[0.99] transition-all flex items-center justify-between group min-h-[96px] focus-visible:ring-2 focus-visible:ring-amber-500 focus:outline-none"
        >
          <div className="flex items-start gap-4 pr-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-charcoal-900 leading-snug">
                {t('home.cardB_title')}
              </h3>
              <p className="mt-1 text-xs text-charcoal-500 leading-relaxed font-sans">
                {t('home.cardB_desc')}
              </p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
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
      </section>

      {/* Footer Assurance */}
      <footer className="text-center pt-2 pb-2">
        <p className="text-[11px] text-charcoal-400">{t('common.powered_by')}</p>
      </footer>
    </main>
  );
};
