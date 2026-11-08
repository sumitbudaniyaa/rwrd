import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft02Icon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import rwrdLogo from '../assets/rwrd.png';
import type { StaffPublic } from '@tiptable/shared';

export const StaffScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    restaurant,
    token,
    isLoading: isRestaurantLoading,
    isError: isRestaurantError,
  } = useRestaurant();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading: isStaffLoading,
    isError: isStaffError,
  } = useQuery({
    queryKey: ['staff', restaurant?.id, token],
    queryFn: () =>
      restaurant ? api.getStaff(restaurant.id, token || undefined) : Promise.reject(),
    enabled: Boolean(restaurant?.id),
    staleTime: 60 * 1000,
    retry: false,
  });

  const staffList = data?.staff || [];

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.roleLabel && s.roleLabel.toLowerCase().includes(q)),
    );
  }, [staffList, searchQuery]);

  if (isRestaurantLoading || isStaffLoading) {
    return <LoadingScreen />;
  }

  if (isRestaurantError || isStaffError || !restaurant) {
    return (
      <ErrorScreen
        title="Could not load staff"
        message="We encountered an issue fetching the restaurant staff roster. Please try again."
      />
    );
  }

  const handleSelectStaff = (staff: StaffPublic) => {
    navigate(`/t/${token}/staff/${staff.id}`, { state: { staff } });
  };

  const handleBack = () => {
    navigate(`/t/${token}`);
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[420px] mx-auto w-full">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to home"
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
          <img src={rwrdLogo} alt="rwrd" className="h-6 w-auto object-contain select-none" />
        </div>
      </div>

      {/* Title & Prompt */}
      <header className="pt-2 pb-5">
        <h1 className="font-serif text-3xl font-normal text-stone-900 tracking-tight leading-tight">
          {t('staff.title')}
        </h1>
        <p className="mt-1 text-xs text-stone-500 font-sans">{t('staff.subtitle')}</p>
      </header>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
          <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-stone-400" strokeWidth={1.5} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('staff.search_placeholder')}
          aria-label="Search staff by name"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 shadow-2xs transition-all font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search query"
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              className="w-4 h-4 text-stone-400 hover:text-stone-700"
              strokeWidth={1.5}
            />
          </button>
        )}
      </div>

      {/* Staff Roster: 2-Column Grid */}
      {filteredStaff.length > 0 ? (
        <section
          aria-label="Staff directory"
          className="grid grid-cols-2 gap-3.5 pb-8 overflow-y-auto"
        >
          {filteredStaff.map((staff) => (
            <button
              key={staff.id}
              type="button"
              onClick={() => handleSelectStaff(staff)}
              className="group text-left p-2.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-xs hover:border-stone-300 active:scale-[0.98] transition-all focus:outline-none cursor-pointer"
            >
              {/* Photo or Initials Avatar */}
              <div className="aspect-square w-full rounded-xl bg-stone-100 border border-stone-200/60 overflow-hidden relative mb-2.5 flex items-center justify-center">
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.displayName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full flex items-center justify-center font-serif text-2xl font-medium text-stone-700 ${
                    staff.photoUrl ? 'hidden' : 'flex'
                  }`}
                >
                  {staff.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              </div>

              {/* Staff Details */}
              <h2 className="font-serif text-sm font-medium text-stone-900 truncate leading-snug">
                {staff.displayName}
              </h2>
              <p className="text-[11px] text-stone-500 font-sans truncate mt-0.5">
                {staff.roleLabel || t('staff.default_role')}
              </p>
            </button>
          ))}
        </section>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-stone-700">{t('staff.empty_title')}</p>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            {searchQuery
              ? t('staff.empty_matching', { query: searchQuery })
              : t('staff.empty_desc')}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs text-stone-800 font-medium transition-all cursor-pointer"
            >
              {t('staff.clear_search')}
            </button>
          )}
        </div>
      )}
    </main>
  );
};
