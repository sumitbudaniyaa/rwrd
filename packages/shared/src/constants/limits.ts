/**
 * Core business boundaries and currency constants.
 * Note: Zero hardcoded limits; these are fallback defaults matching validated server env.
 */
export const CURRENCY = 'INR' as const;

export const DEFAULT_TIP_PRESETS = [20, 50, 100, 200] as const;

export const TIP_BOUNDS = {
  MIN_INR: 1,
  MAX_INR: 10000,
} as const;

export const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
