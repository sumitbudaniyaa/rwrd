import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useRestaurant } from '../context/RestaurantContext.js';
import { api } from '../services/api.js';
import { LoadingScreen } from './LoadingScreen.js';
import { ErrorScreen } from './ErrorScreen.js';
import { ServerAvatar } from '@tiptable/ui';
import rwrdLogo from '../assets/rwrd.png';
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
  });

  const staff = stateStaff || staffData?.staff?.find((s) => s.id === staffId);

  const presets = restaurant?.tipPresets || [20, 50, 100, 200];
  const minTip = restaurant?.minTipInr ?? 10;
  const maxTip = restaurant?.maxTipInr ?? 5000;

  // Default to second preset or 50
  const defaultAmount = presets[1] || presets[0] || 50;

  const [amount, setAmount] = useState<number>(defaultAmount);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate bounds whenever amount changes
  useEffect(() => {
    if (amount <= 0) {
      setValidationError(null);
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

        {/* Selected Staff Profile Card */}
        <div className="mt-2 p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs flex items-center gap-3.5">
          <ServerAvatar
            photoUrl={staff.photoUrl}
            name={staff.displayName}
            roleLabel={staff.roleLabel}
            size="lg"
            shape="rounded"
          />
          <div>
            <h2 className="font-serif text-lg font-medium text-stone-900 leading-snug">
              {staff.displayName}
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              {staff.roleLabel || t('staff.default_role')}
            </p>
          </div>
        </div>

        {/* Amount Section */}
        <section className="pt-8 pb-4">
          <h1 className="font-serif text-2xl font-normal text-stone-900 text-center tracking-tight">
            {t('amount.title')}
          </h1>
          <p className="mt-1 text-xs text-stone-500 font-sans text-center">
            {t('amount.subtitle', { name: staff.displayName.split(' ')[0] })}
          </p>

          {/* Preset Chips with beUI Spring-Gliding Active Pill */}
          <motion.div layoutRoot className="grid grid-cols-4 gap-2.5 mt-6">
            {presets.map((preset) => {
              const isSelected = !isCustom && amount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{ zIndex: isSelected ? 10 : 1 }}
                  className={`relative py-3 min-h-[48px] flex items-center justify-center rounded-xl text-sm font-semibold transition-colors cursor-pointer select-none outline-none focus:outline-none ${
                    isSelected
                      ? 'text-stone-950 font-bold'
                      : 'bg-white border border-stone-200 text-stone-800 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="amount-preset-active-pill"
                      className="absolute inset-0 bg-[#FFE862] border border-[#E5CF4B] rounded-xl shadow-2xs z-0"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span className="relative z-10 transition-colors duration-150">₹{preset}</span>
                </button>
              );
            })}
          </motion.div>

          {/* Custom Amount Input */}
          <div className="mt-5">
            <label
              htmlFor="custom-amount"
              className="block text-xs font-medium text-stone-600 mb-1.5 font-sans"
            >
              {t('amount.custom_label')}
            </label>
            <div className="relative rounded-xl shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 font-medium text-base font-sans select-none">
                ₹
              </div>
              <input
                id="custom-amount"
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={handleCustomChange}
                placeholder={t('amount.custom_placeholder')}
                className={`w-full pl-8 pr-4 py-3 rounded-xl bg-white border text-base font-semibold text-stone-900 placeholder:text-stone-400 placeholder:font-normal placeholder:text-base focus:outline-none transition-all font-sans leading-normal ${
                  validationError && isCustom
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-200'
                }`}
              />
            </div>
            {validationError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium font-sans">{validationError}</p>
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
          className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
            isButtonDisabled
              ? 'bg-stone-100 text-stone-400 border border-stone-200/60 cursor-not-allowed shadow-none'
              : 'bg-[#FFE862] hover:bg-[#F5DE53] active:bg-[#ebd347] active:scale-[0.98] text-stone-950'
          }`}
        >
          <span>{t('amount.button')}</span>
          {!isButtonDisabled && amount > 0 && (
            <>
              <span>•</span>
              <span className="font-bold">₹{amount.toLocaleString('en-IN')}</span>
            </>
          )}
        </button>
      </footer>
    </main>
  );
};
