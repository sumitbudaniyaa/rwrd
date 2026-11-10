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
import heartIcon from '../assets/heart.png';

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { restaurant, token, isLoading, isError } = useRestaurant();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !restaurant) {
    return <ErrorScreen />;
  }

  const hasReviewUrl = Boolean(
    restaurant.googleReviewUrl && restaurant.googleReviewUrl.trim().length > 0,
  );
  const showReviewOption = Boolean(restaurant.reviewsEnabled !== false && hasReviewUrl);
  const showTipOption = Boolean(
    restaurant.tippingEnabled !== false && restaurant.hasActiveStaff !== false,
  );

  const handleReviewClick = () => {
    if (!hasReviewUrl || !restaurant.googleReviewUrl) return;
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

  // If both tipping and Google review options are unavailable / missing
  if (!showTipOption && !showReviewOption) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-[420px] mx-auto w-full text-center">
        {/* Setup In-Progress Illustration & Copy */}
        <section className="py-8 flex flex-col items-center">
          <div className="mb-6 flex items-center justify-center">
            <img
              src={heartIcon}
              alt="rwrd heart"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain select-none"
              loading="eager"
            />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-stone-900 tracking-tight leading-snug flex items-center justify-center flex-wrap gap-2">
            <span>{restaurant.name} is setting up</span>
            <img
              src={rwrdLogo}
              alt="RWRD"
              className="h-6 sm:h-7 w-auto object-contain inline-block align-middle select-none"
            />
          </h1>

          <p className="mt-3 text-sm text-stone-500 font-sans">come back later</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col justify-between p-6 max-w-[420px] mx-auto w-full">
      {/* Header Section: Restaurant Name in Top Middle */}
      <header className="pt-2 pb-4 flex items-center justify-center w-full text-center">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-stone-700 font-sans truncate max-w-[280px]">
          {restaurant.name}
        </h2>
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
        {showTipOption && (
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
        )}

        {/* Card B: Review us */}
        {showReviewOption && (
          <button
            type="button"
            onClick={handleReviewClick}
            className="w-full text-left p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-xs hover:border-stone-300/90 active:scale-[0.99] transition-all flex items-center justify-between group min-h-[96px] focus-visible:ring-2 focus-visible:ring-[#FFE862] focus:outline-none cursor-pointer"
          >
            <div className="flex items-start gap-4 pr-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/60 text-stone-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <HugeiconsIcon
                  icon={StarIcon}
                  className="w-6 h-6 text-stone-800"
                  strokeWidth={1.5}
                />
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
        )}
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
