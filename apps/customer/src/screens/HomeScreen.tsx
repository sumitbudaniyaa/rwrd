import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { FavouriteIcon, StarIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useRestaurant } from '../context/RestaurantContext.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import { api } from '../services/api.js';
import rwrdLogo from '../assets/rwrd.png';

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
      {/* Header Section: Restaurant Logo on Left, Name & Table on Right */}
      <header className="pt-2 pb-4 flex items-center justify-between w-full">
        <div className="flex items-center flex-shrink-0">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="max-h-11 max-w-[120px] w-auto h-auto object-contain"
              loading="eager"
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

          {table && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200/70 text-[11px] text-stone-600 font-medium">
              <span>{table.tableNumber}</span>
              {table.section && (
                <>
                  <span className="text-stone-400">•</span>
                  <span>{table.section}</span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Greeting Section: Editorial Serif Greeting */}
      <section className="my-auto py-8 text-center">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight leading-tight">
          {t('home.greeting')}
        </h1>
      </section>

      {/* Action Cards: Equal Visual Weight */}
      <section className="space-y-3.5 pb-4">
        {/* Card A: Make people happy */}
        <button
          type="button"
          onClick={handleStaffClick}
          className="w-full text-left p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-xs hover:border-stone-300/90 active:scale-[0.99] transition-all flex items-center justify-between group min-h-[96px] focus-visible:ring-2 focus-visible:ring-[#FFE862] focus:outline-none cursor-pointer"
        >
          <div className="flex items-start gap-4 pr-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFE862]/25 border border-[#FFE862]/50 text-stone-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <HugeiconsIcon
                icon={FavouriteIcon}
                className="w-6 h-6 text-stone-900"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900 leading-snug">
                {t('home.cardA_title')}
              </h3>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed font-sans">
                {t('home.cardA_desc')}
              </p>
            </div>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
            strokeWidth={1.5}
          />
        </button>

        {/* Card B: Review us */}
        <button
          type="button"
          onClick={handleReviewClick}
          className="w-full text-left p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-xs hover:border-stone-300/90 active:scale-[0.99] transition-all flex items-center justify-between group min-h-[96px] focus-visible:ring-2 focus-visible:ring-[#FFE862] focus:outline-none cursor-pointer"
        >
          <div className="flex items-start gap-4 pr-3">
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/60 text-stone-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <HugeiconsIcon icon={StarIcon} className="w-6 h-6 text-stone-800" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-900 leading-snug">
                {t('home.cardB_title')}
              </h3>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed font-sans">
                {t('home.cardB_desc')}
              </p>
            </div>
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="w-5 h-5 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
            strokeWidth={1.5}
          />
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
