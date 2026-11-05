import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import type { StaffPublic } from '@tiptable/shared';

export const StaffScreen: React.FC = () => {
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
    queryKey: ['staff', restaurant?.id],
    queryFn: () => (restaurant ? api.getStaff(restaurant.id) : Promise.reject()),
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

      {/* Title & Prompt */}
      <header className="pt-2 pb-5">
        <h1 className="font-serif text-3xl font-normal text-charcoal-900 tracking-tight leading-tight">
          Who served you?
        </h1>
        <p className="mt-1 text-xs text-charcoal-500 font-sans">
          Select your server to send a direct tip via UPI
        </p>
      </header>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          aria-label="Search staff by name"
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-cream-300 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search query"
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-charcoal-400 hover:text-charcoal-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
              className="group text-left p-2.5 rounded-2xl bg-white border border-cream-300/80 shadow-sm hover:border-brand-accent/50 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-brand-accent focus:outline-none"
            >
              {/* Photo or Initials Avatar */}
              <div className="aspect-square w-full rounded-xl bg-cream-200 overflow-hidden relative mb-2.5 flex items-center justify-center">
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
                  className={`w-full h-full flex items-center justify-center font-serif text-2xl font-medium text-charcoal-600 ${
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
              <h2 className="font-serif text-sm font-medium text-charcoal-900 truncate leading-snug">
                {staff.displayName}
              </h2>
              <p className="text-[11px] text-charcoal-500 font-sans truncate mt-0.5">
                {staff.roleLabel || 'Server'}
              </p>
            </button>
          ))}
        </section>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-charcoal-700">No staff found</p>
          <p className="text-xs text-charcoal-400 mt-1 max-w-xs">
            {searchQuery
              ? `No waitstaff matching "${searchQuery}". Check the spelling or search by first name.`
              : 'No waitstaff active at this moment.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3 py-1.5 text-xs text-brand-accent font-medium hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </main>
  );
};
