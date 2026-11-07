import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  Alert01Icon,
  ImageUpload01Icon,
  Add01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Badge, SlideUp } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, ApiError, type UpdateRestaurantSettingsInput } from '../services/api.js';

export const SettingsScreen: React.FC = () => {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId || restaurant?.id || '';

  // Form states
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [tipPresets, setTipPresets] = useState<number[]>([20, 50, 100, 200]);
  const [newPresetValue, setNewPresetValue] = useState('');
  const [minTipInr, setMinTipInr] = useState<number>(10);
  const [maxTipInr, setMaxTipInr] = useState<number>(5000);

  // Field-wise editing toggles
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingGoogleReview, setIsEditingGoogleReview] = useState(false);
  const [isEditingTipPresets, setIsEditingTipPresets] = useState(false);
  const [isEditingTipBounds, setIsEditingTipBounds] = useState(false);

  // Field currently performing save mutation
  const [savingField, setSavingField] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurant-settings', restaurantId],
    queryFn: () => (restaurantId ? api.getRestaurantSettings(restaurantId) : Promise.reject()),
    enabled: Boolean(restaurantId),
  });

  const savedSettings = data?.restaurant;

  // Populate form from API query
  useEffect(() => {
    if (savedSettings) {
      setName(savedSettings.name);
      setLogoPreview(savedSettings.logoUrl);
      setGoogleReviewUrl(savedSettings.googleReviewUrl || '');
      setTipPresets(savedSettings.tipPresets || [20, 50, 100, 200]);
      setMinTipInr(savedSettings.minTipInr || 10);
      setMaxTipInr(savedSettings.maxTipInr || 5000);
    }
  }, [savedSettings]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateRestaurantSettingsInput) =>
      api.updateRestaurantSettings(restaurantId, payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-restaurant-settings', restaurantId],
      });
      setSuccessMessage('Restaurant settings updated successfully.');
      setFormError(null);
      if (res?.restaurant?.name) setName(res.restaurant.name);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.problem.detail || err.problem.title);
      } else {
        setFormError('Failed to update settings. Please check values.');
      }
    },
  });

  // Client-side Google review link validation
  const isGoogleUrlValid =
    !googleReviewUrl ||
    googleReviewUrl.includes('google.com') ||
    googleReviewUrl.includes('goo.gl') ||
    googleReviewUrl.includes('g.page');

  // Client-side logo upload & compression
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 256, 256);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setLogoPreview(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newPresetValue.trim(), 10);
    if (isNaN(val) || val <= 0) return;

    if (tipPresets.includes(val)) {
      setFormError('Preset amount already exists.');
      return;
    }

    if (tipPresets.length >= 6) {
      setFormError('Maximum 6 tip preset amounts allowed.');
      return;
    }

    const updated = [...tipPresets, val].sort((a, b) => a - b);
    setTipPresets(updated);
    setNewPresetValue('');
    setFormError(null);
  };

  const handleRemovePreset = (val: number) => {
    if (tipPresets.length <= 1) {
      setFormError('At least one tip preset amount is required.');
      return;
    }
    setTipPresets(tipPresets.filter((p) => p !== val));
  };

  // Dirty state checks per field
  const isNameDirty = Boolean(
    savedSettings && name.trim() !== (savedSettings.name || '') && name.trim().length >= 2,
  );

  const isLogoDirty = Boolean(savedSettings && logoPreview !== (savedSettings.logoUrl || null));

  const isGoogleDirty = Boolean(
    savedSettings &&
    googleReviewUrl.trim() !== (savedSettings.googleReviewUrl || '') &&
    isGoogleUrlValid &&
    googleReviewUrl.trim().length > 0,
  );

  const isPresetsDirty = Boolean(
    savedSettings &&
    tipPresets.length >= 1 &&
    JSON.stringify([...tipPresets].sort((a, b) => a - b)) !==
      JSON.stringify([...(savedSettings.tipPresets || [20, 50, 100, 200])].sort((a, b) => a - b)),
  );

  const isBoundsDirty = Boolean(
    savedSettings &&
    minTipInr <= maxTipInr &&
    minTipInr > 0 &&
    maxTipInr > 0 &&
    (minTipInr !== (savedSettings.minTipInr || 10) ||
      maxTipInr !== (savedSettings.maxTipInr || 5000)),
  );

  // Field-wise save dispatchers
  const handleSaveName = () => {
    if (!isNameDirty) return;
    setFormError(null);
    setSuccessMessage(null);
    setSavingField('name');
    updateMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setIsEditingName(false);
          setSavingField(null);
        },
        onError: () => setSavingField(null),
      },
    );
  };

  const handleSaveLogo = () => {
    if (!isLogoDirty) return;
    setFormError(null);
    setSuccessMessage(null);
    setSavingField('logo');
    updateMutation.mutate(
      { logoUrl: logoPreview },
      {
        onSuccess: () => {
          setIsEditingLogo(false);
          setSavingField(null);
        },
        onError: () => setSavingField(null),
      },
    );
  };

  const handleSaveGoogleReview = () => {
    if (!isGoogleDirty) return;
    if (!isGoogleUrlValid) {
      setFormError(
        'Google review link must be a valid Google Maps or Google Business review URL (e.g. maps.app.goo.gl or g.page/r/...)',
      );
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    setSavingField('googleReviewUrl');
    updateMutation.mutate(
      { googleReviewUrl: googleReviewUrl.trim() },
      {
        onSuccess: () => {
          setIsEditingGoogleReview(false);
          setSavingField(null);
        },
        onError: () => setSavingField(null),
      },
    );
  };

  const handleSavePresets = () => {
    if (!isPresetsDirty) return;
    setFormError(null);
    setSuccessMessage(null);
    setSavingField('tipPresets');
    updateMutation.mutate(
      { tipPresets },
      {
        onSuccess: () => {
          setIsEditingTipPresets(false);
          setSavingField(null);
        },
        onError: () => setSavingField(null),
      },
    );
  };

  const handleSaveBounds = () => {
    if (!isBoundsDirty) return;
    if (minTipInr > maxTipInr) {
      setFormError('Minimum tip cannot exceed maximum tip.');
      return;
    }
    setFormError(null);
    setSuccessMessage(null);
    setSavingField('tipBounds');
    updateMutation.mutate(
      { minTipInr, maxTipInr },
      {
        onSuccess: () => {
          setIsEditingTipBounds(false);
          setSavingField(null);
        },
        onError: () => setSavingField(null),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-stone-400">
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs">Loading restaurant configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              restaurant settings
            </h1>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Badge variant="neutral" className="text-[11px] font-medium text-stone-600">
              Role:{' '}
              <strong className="capitalize ml-1 text-stone-900">{user?.role || 'admin'}</strong>
            </Badge>
          </div>
        </div>
      </SlideUp>

      {/* Alert Messages */}
      {formError && (
        <SlideUp>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="leading-relaxed font-medium">{formError}</div>
          </div>
        </SlideUp>
      )}

      {successMessage && (
        <SlideUp>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 flex items-start gap-2.5 shadow-2xs">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="leading-relaxed font-medium">{successMessage}</div>
          </div>
        </SlideUp>
      )}

      <div className="space-y-6">
        {/* Section 1: Brand & Profile */}
        <SlideUp delay={50}>
          <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs space-y-5 hover:shadow-xs transition-all duration-200">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                brand & legal entity
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Public name and logo displayed on the customer landing and tipping viewports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Field 1: Restaurant Legal Name */}
              <div className="space-y-2">
                {!isEditingName ? (
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/70 bg-stone-50/40">
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
                        Restaurant Legal Name <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-sm font-semibold text-stone-900 mt-0.5 block truncate">
                        {name || savedSettings?.name || '—'}
                      </span>
                    </div>
                    <MotionButton
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingName(true)}
                      className="px-3 py-1.5 text-xs shrink-0"
                    >
                      Edit
                    </MotionButton>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl border border-stone-300/80 bg-white shadow-2xs">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-stone-700">
                        Restaurant Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. The Bombay Canteen"
                        className="w-full px-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                      <MotionButton
                        variant="ghost"
                        size="sm"
                        disabled={savingField === 'name'}
                        onClick={() => {
                          setName(savedSettings?.name || '');
                          setIsEditingName(false);
                        }}
                        className="px-3 py-1.5 text-xs text-stone-600"
                      >
                        Cancel
                      </MotionButton>
                      <MotionButton
                        variant="primary"
                        size="sm"
                        disabled={!isNameDirty || savingField === 'name'}
                        isLoading={savingField === 'name'}
                        onClick={handleSaveName}
                        className="px-3.5 py-1.5 text-xs"
                      >
                        Save
                      </MotionButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 2: Restaurant Logo */}
              <div className="space-y-2">
                {!isEditingLogo ? (
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/70 bg-stone-50/40">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200/60 overflow-hidden flex items-center justify-center shrink-0 text-stone-400 shadow-2xs">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Restaurant Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ImageUpload01Icon}
                            className="w-5 h-5"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
                          Restaurant Logo
                        </span>
                        <span className="text-xs text-stone-600 mt-0.5 block truncate">
                          {logoPreview ? 'Custom logo uploaded' : 'No logo configured'}
                        </span>
                      </div>
                    </div>
                    <MotionButton
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingLogo(true)}
                      className="px-3 py-1.5 text-xs shrink-0"
                    >
                      Edit
                    </MotionButton>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl border border-stone-300/80 bg-white shadow-2xs">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200/60 overflow-hidden flex items-center justify-center shrink-0 text-stone-400 shadow-2xs">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Restaurant Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ImageUpload01Icon}
                            className="w-6 h-6"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 cursor-pointer shadow-2xs transition-colors">
                            <span>Change Logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                          {logoPreview && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400">
                          Auto-resized and compressed to 256×256 square format.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                      <MotionButton
                        variant="ghost"
                        size="sm"
                        disabled={savingField === 'logo'}
                        onClick={() => {
                          setLogoPreview(savedSettings?.logoUrl || null);
                          setIsEditingLogo(false);
                        }}
                        className="px-3 py-1.5 text-xs text-stone-600"
                      >
                        Cancel
                      </MotionButton>
                      <MotionButton
                        variant="primary"
                        size="sm"
                        disabled={!isLogoDirty || savingField === 'logo'}
                        isLoading={savingField === 'logo'}
                        onClick={handleSaveLogo}
                        className="px-3.5 py-1.5 text-xs"
                      >
                        Save
                      </MotionButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SlideUp>

        {/* Section 2: Google Review Link */}
        <SlideUp delay={100}>
          <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs space-y-4 hover:shadow-xs transition-all duration-200">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                google review integration
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Diners tap &quot;Review us&quot; to go straight to your official Google review
                submission screen.
              </p>
            </div>

            <div className="space-y-3">
              {!isEditingGoogleReview ? (
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/70 bg-stone-50/40">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
                      Google Review URL <span className="text-rose-500">*</span>
                    </span>
                    {googleReviewUrl ? (
                      <a
                        href={googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-stone-800 hover:text-stone-950 truncate block mt-0.5 underline underline-offset-2"
                      >
                        {googleReviewUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400 block mt-0.5">Not configured</span>
                    )}
                  </div>
                  <MotionButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingGoogleReview(true)}
                    className="px-3 py-1.5 text-xs shrink-0"
                  >
                    Edit
                  </MotionButton>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-stone-300/80 bg-white shadow-2xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      Google Review URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      autoFocus
                      value={googleReviewUrl}
                      onChange={(e) => setGoogleReviewUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/... or https://g.page/r/..."
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono outline-none transition-all duration-150 ${
                        !isGoogleUrlValid
                          ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.08)]'
                          : 'border-stone-200 bg-white text-stone-900 placeholder:font-sans placeholder:text-stone-400 focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]'
                      }`}
                    />
                    {!isGoogleUrlValid && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        URL must be an official Google Maps / Business link (maps.app.goo.gl,
                        g.page/r/, or google.com).
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      disabled={savingField === 'googleReviewUrl'}
                      onClick={() => {
                        setGoogleReviewUrl(savedSettings?.googleReviewUrl || '');
                        setIsEditingGoogleReview(false);
                      }}
                      className="px-3 py-1.5 text-xs text-stone-600"
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      variant="primary"
                      size="sm"
                      disabled={!isGoogleDirty || savingField === 'googleReviewUrl'}
                      isLoading={savingField === 'googleReviewUrl'}
                      onClick={handleSaveGoogleReview}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Save
                    </MotionButton>
                  </div>
                </div>
              )}

              {/* Policy Invariant Banner */}
              <div className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/70 text-[11px] text-stone-600 leading-relaxed">
                <strong>Google Policy Compliance:</strong> Reviews are completely un-gated. The
                review button redirects straight to Google with no intermediaries or incentives.
              </div>
            </div>
          </div>
        </SlideUp>

        {/* Section 3: Tip Presets & Bounds */}
        <SlideUp delay={150}>
          <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs space-y-5 hover:shadow-xs transition-all duration-200">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                tip presets & bounds
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure quick-pick chip amounts (1-6 chips) and operational limits in Indian
                Rupees (INR).
              </p>
            </div>

            {/* Field 4: Quick-Pick Chips */}
            <div className="space-y-3">
              {!isEditingTipPresets ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/70 bg-stone-50/40">
                  <div>
                    <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider mb-2">
                      Quick-Pick Tip Chips (INR)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {tipPresets.map((preset) => (
                        <span
                          key={preset}
                          className="inline-flex items-center px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200/70 text-xs font-semibold text-stone-800 shadow-2xs"
                        >
                          ₹{preset}
                        </span>
                      ))}
                    </div>
                  </div>
                  <MotionButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingTipPresets(true)}
                    className="px-3 py-1.5 text-xs shrink-0 self-start sm:self-auto"
                  >
                    Edit
                  </MotionButton>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-stone-300/80 bg-white shadow-2xs">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-2">
                      Quick-Pick Tip Chips (INR){' '}
                      <span className="text-[11px] text-stone-400 font-normal">(1–6 chips)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {tipPresets.map((preset) => (
                        <div
                          key={preset}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200/70 text-xs font-semibold text-stone-800 shadow-2xs"
                        >
                          <span>₹{preset}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePreset(preset)}
                            aria-label={`Remove ₹${preset}`}
                            className="text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <HugeiconsIcon
                              icon={Cancel01Icon}
                              className="w-3.5 h-3.5"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      ))}

                      {tipPresets.length < 6 && (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10000"
                            value={newPresetValue}
                            onChange={(e) => setNewPresetValue(e.target.value)}
                            placeholder="+ Add ₹"
                            className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                          />
                          <button
                            type="button"
                            onClick={handleAddPreset}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                            title="Add chip"
                          >
                            <HugeiconsIcon
                              icon={Add01Icon}
                              className="w-3.5 h-3.5"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      disabled={savingField === 'tipPresets'}
                      onClick={() => {
                        setTipPresets(savedSettings?.tipPresets || [20, 50, 100, 200]);
                        setNewPresetValue('');
                        setIsEditingTipPresets(false);
                      }}
                      className="px-3 py-1.5 text-xs text-stone-600"
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      variant="primary"
                      size="sm"
                      disabled={!isPresetsDirty || savingField === 'tipPresets'}
                      isLoading={savingField === 'tipPresets'}
                      onClick={handleSavePresets}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Save
                    </MotionButton>
                  </div>
                </div>
              )}
            </div>

            {/* Field 5: Min and Max Limits */}
            <div className="pt-2">
              {!isEditingTipBounds ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/70 bg-stone-50/40">
                  <div>
                    <span className="text-[11px] font-medium text-stone-500 block uppercase tracking-wider">
                      Tipping Limits (INR)
                    </span>
                    <span className="text-sm font-semibold text-stone-900 mt-0.5 block">
                      Min: ₹{minTipInr} · Max: ₹{maxTipInr}
                    </span>
                  </div>
                  <MotionButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingTipBounds(true)}
                    className="px-3 py-1.5 text-xs shrink-0 self-start sm:self-auto"
                  >
                    Edit
                  </MotionButton>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl border border-stone-300/80 bg-white shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-stone-700">
                        Minimum Tip (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={maxTipInr}
                          required
                          value={minTipInr}
                          onChange={(e) => setMinTipInr(parseInt(e.target.value, 10) || 1)}
                          className="w-full pl-7 pr-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-stone-700">
                        Maximum Tip (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={minTipInr}
                          max="50000"
                          required
                          value={maxTipInr}
                          onChange={(e) => setMaxTipInr(parseInt(e.target.value, 10) || 10000)}
                          className="w-full pl-7 pr-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                        />
                      </div>
                    </div>
                  </div>
                  {minTipInr > maxTipInr && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      Minimum tip cannot exceed maximum tip.
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      disabled={savingField === 'tipBounds'}
                      onClick={() => {
                        setMinTipInr(savedSettings?.minTipInr || 10);
                        setMaxTipInr(savedSettings?.maxTipInr || 5000);
                        setIsEditingTipBounds(false);
                      }}
                      className="px-3 py-1.5 text-xs text-stone-600"
                    >
                      Cancel
                    </MotionButton>
                    <MotionButton
                      variant="primary"
                      size="sm"
                      disabled={!isBoundsDirty || savingField === 'tipBounds'}
                      isLoading={savingField === 'tipBounds'}
                      onClick={handleSaveBounds}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Save
                    </MotionButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SlideUp>
      </div>
    </div>
  );
};
