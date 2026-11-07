import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
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

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurant-settings', restaurantId],
    queryFn: () => (restaurantId ? api.getRestaurantSettings(restaurantId) : Promise.reject()),
    enabled: Boolean(restaurantId),
  });

  // Populate form from API query
  useEffect(() => {
    if (data?.restaurant) {
      const rest = data.restaurant;
      setName(rest.name);
      setLogoPreview(rest.logoUrl);
      setGoogleReviewUrl(rest.googleReviewUrl);
      setTipPresets(rest.tipPresets || [20, 50, 100, 200]);
      setMinTipInr(rest.minTipInr || 10);
      setMaxTipInr(rest.maxTipInr || 5000);
    }
  }, [data]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (minTipInr > maxTipInr) {
      setFormError('Minimum tip cannot exceed maximum tip.');
      return;
    }

    if (!isGoogleUrlValid) {
      setFormError(
        'Google review link must be a valid Google Maps or Google Business review URL (e.g. maps.app.goo.gl or g.page/r/...)',
      );
      return;
    }

    const payload: UpdateRestaurantSettingsInput = {
      googleReviewUrl: googleReviewUrl.trim(),
      tipPresets,
      minTipInr,
      maxTipInr,
    };

    if (name.trim()) {
      payload.name = name.trim();
    }

    if (logoPreview !== null) {
      payload.logoUrl = logoPreview;
    }

    updateMutation.mutate(payload);
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
              Restaurant Settings
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-sans tracking-tight">
              Manage your restaurant branding, Google review landing URL, and tipping bounds.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Badge variant="neutral" className="text-[11px] font-medium text-stone-600">
              Role:{' '}
              <strong className="capitalize ml-1 text-stone-900">{user?.role || 'staff'}</strong>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Brand & Profile */}
        <SlideUp delay={50}>
          <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs space-y-5 hover:shadow-xs transition-all duration-200">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Brand & Legal Entity
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Public name and logo displayed on the customer landing and tipping viewports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Restaurant Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  Restaurant Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Bombay Canteen"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">Restaurant Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200/60 overflow-hidden flex items-center justify-center flex-shrink-0 text-stone-400 shadow-2xs">
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
              </div>
            </div>
          </div>
        </SlideUp>

        {/* Section 2: Google Review Link */}
        <SlideUp delay={100}>
          <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs space-y-4 hover:shadow-xs transition-all duration-200">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Google Review Integration
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Diners tap "Review us" to go straight to your official Google review submission
                screen.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-700">
                Google Review URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/... or https://g.page/r/..."
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono transition-all ${
                  !isGoogleUrlValid
                    ? 'border-rose-400 bg-rose-50/30 text-rose-900'
                    : 'border-stone-200 bg-white text-stone-900 placeholder:font-sans placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]'
                }`}
              />

              {!isGoogleUrlValid && (
                <p className="text-[11px] text-rose-600 font-medium">
                  URL must be an official Google Maps / Business link (maps.app.goo.gl, g.page/r/,
                  or google.com).
                </p>
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
                Tip Presets & Bounds
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure quick-pick chip amounts (1-6 chips) and operational limits in Indian
                Rupees (INR).
              </p>
            </div>

            {/* Quick-Pick Chips */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-stone-700">
                Quick-Pick Tip Chips (INR)
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
                      className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddPreset}
                      className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                      title="Add chip"
                    >
                      <HugeiconsIcon icon={Add01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-stone-400">
                Tip chips appear on Customer Screen 3 for one-tap amount selection.
              </p>
            </div>

            {/* Min and Max Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                    className="w-full pl-7 pr-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
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
                    className="w-full pl-7 pr-3 py-2 rounded-xl text-xs border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </SlideUp>

        {/* Submit Actions */}
        <SlideUp delay={200}>
          <div className="flex items-center justify-end gap-3 pt-2">
            <MotionButton
              type="submit"
              variant="primary"
              size="md"
              isLoading={updateMutation.isPending}
              className="px-5 py-2.5 min-w-36"
            >
              <HugeiconsIcon icon={Settings01Icon} className="w-4 h-4" strokeWidth={1.5} />
              <span>Save Settings</span>
            </MotionButton>
          </div>
        </SlideUp>
      </form>
    </div>
  );
};
