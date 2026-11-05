import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.js';
import type { StaffPublic } from '@tiptable/shared';

export const AmountScreen: React.FC = () => {
  const { t } = useTranslation();
  const { staffId } = useParams<{ staffId: string }>();
  const { restaurant, token, isLoading: isRestaurantLoading } = useRestaurant();
  const navigate = useNavigate();
  const location = useLocation();

  // Try to use passed router state, or fallback to fetching staff list
  const stateStaff = (location.state as { staff?: StaffPublic } | undefined)?.staff;

  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff', restaurant?.id],
    queryFn: () => (restaurant ? api.getStaff(restaurant.id) : Promise.reject()),
    enabled: Boolean(restaurant?.id && !stateStaff),
    staleTime: 60 * 1000,
    retry: false,
  });

  const staff = stateStaff || staffData?.staff?.find((s) => s.id === staffId);

  const presets = restaurant?.tipPresets || [20, 50, 100, 200];
  const minTip = restaurant?.minTipInr || 1;
  const maxTip = restaurant?.maxTipInr || 10000;

  // Default to the 2nd preset chip (e.g., ₹50 or ₹100)
  const defaultPreset = (presets.length >= 2 ? presets[1] : presets[0]) ?? 50;
  const [amount, setAmount] = useState<number>(defaultPreset);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate whenever amount changes
  useEffect(() => {
    if (!amount || isNaN(amount)) {
      setValidationError('Please enter a tip amount');
      return;
    }
    if (amount < minTip) {
      setValidationError(t('amount.err_min', { min: minTip }));
      return;
    }
    if (amount > maxTip) {
      setValidationError(t('amount.err_max', { max: maxTip.toLocaleString('en-IN') }));
      return;
    }
    setValidationError(null);
  }, [amount, minTip, maxTip, t]);

  if (isRestaurantLoading || (isStaffLoading && !stateStaff)) {
    return <LoadingScreen />;
  }

  if (!restaurant || !staff) {
    return (
      <ErrorScreen
        title="Server not found"
        message="Could not find the requested waitstaff member. Please select from the list."
      />
    );
  }

  const handleSelectPreset = (presetValue: number) => {
    setIsCustom(false);
    setCustomInput('');
    setAmount(presetValue);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setIsCustom(true);
    setCustomInput(val);
    const num = parseInt(val, 10);
    setAmount(isNaN(num) ? 0 : num);
  };

  const handleProceed = () => {
    if (validationError || !amount) return;
    navigate(`/t/${token}/staff/${staff.id}/pay`, {
      state: {
        staff,
        amountInr: amount,
      },
    });
  };

  const handleBack = () => {
    navigate(`/t/${token}/staff`);
  };

  const isButtonDisabled = Boolean(validationError) || !amount || amount <= 0;

  return (
    <main className="flex-1 flex flex-col justify-between p-6 max-w-[420px] mx-auto w-full">
      {/* Top Header & Back Button */}
      <div>
        <div className="flex items-center justify-between pb-4">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to staff list"
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
            <span>{t('common.back')}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-charcoal-400 uppercase tracking-wider hidden sm:inline">
              {restaurant.name}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Selected Staff Profile Card */}
        <div className="mt-2 p-4 rounded-2xl bg-white border border-cream-300/80 shadow-sm flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-cream-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-serif text-xl font-medium text-charcoal-700">
            {staff.photoUrl ? (
              <img
                src={staff.photoUrl}
                alt={staff.displayName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              staff.displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-serif text-lg font-medium text-charcoal-900 leading-snug">
              {staff.displayName}
            </h2>
            <p className="text-xs text-charcoal-500 font-sans mt-0.5">
              {staff.roleLabel || t('staff.default_role')}
            </p>
          </div>
        </div>

        {/* Amount Section */}
        <section className="pt-8 pb-4">
          <h1 className="font-serif text-2xl font-normal text-charcoal-900 text-center tracking-tight">
            {t('amount.title')}
          </h1>
          <p className="mt-1 text-xs text-charcoal-500 font-sans text-center">
            {t('amount.subtitle', { name: staff.displayName.split(' ')[0] })}
          </p>

          {/* Preset Chips */}
          <div className="grid grid-cols-4 gap-2.5 mt-6">
            {presets.map((preset) => {
              const isSelected = !isCustom && amount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                    isSelected
                      ? 'bg-charcoal-900 text-white shadow-sm scale-[1.02]'
                      : 'bg-white border border-cream-300 text-charcoal-800 hover:border-brand-accent/50 active:scale-95'
                  }`}
                >
                  ₹{preset}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Input */}
          <div className="mt-5">
            <label
              htmlFor="custom-amount"
              className="block text-xs font-medium text-charcoal-600 mb-1.5"
            >
              {t('amount.custom_label')}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-charcoal-500 font-semibold text-lg">
                ₹
              </div>
              <input
                id="custom-amount"
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={handleCustomChange}
                placeholder={t('amount.custom_placeholder')}
                className={`w-full pl-9 pr-4 py-3.5 rounded-xl bg-white border text-lg font-semibold text-charcoal-900 placeholder:text-charcoal-400 placeholder:font-normal placeholder:text-sm focus:outline-none transition-all ${
                  validationError && isCustom
                    ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                    : 'border-cream-300 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent'
                }`}
              />
            </div>
            {validationError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">{validationError}</p>
            )}
          </div>
        </section>
      </div>

      {/* Primary Action Button */}
      <footer className="pt-6 pb-2">
        <button
          type="button"
          onClick={handleProceed}
          disabled={isButtonDisabled}
          className={`w-full py-4 rounded-xl text-base font-medium transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
            isButtonDisabled
              ? 'bg-cream-300/60 text-charcoal-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white'
          }`}
        >
          <span>{t('amount.button')}</span>
          {!isButtonDisabled && amount > 0 && (
            <>
              <span>•</span>
              <span className="font-semibold">₹{amount.toLocaleString('en-IN')}</span>
            </>
          )}
        </button>
      </footer>
    </main>
  );
};
