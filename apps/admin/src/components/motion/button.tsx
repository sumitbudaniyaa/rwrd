import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { springPhysics } from './ease.js';

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      disabled,
      isLoading,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2.5 h-10 gap-2 min-h-[40px]',
      lg: 'text-sm sm:text-base px-5 py-3 h-12 gap-2.5 min-h-[48px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-stone-950 text-white hover:bg-black focus-visible:ring-stone-900 shadow-sm shadow-stone-900/10 hover:shadow-md hover:shadow-stone-900/20',
      secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200/80 focus-visible:ring-stone-400',
      outline:
        'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 focus-visible:ring-stone-400 shadow-sm',
      ghost:
        'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
      danger:
        'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-500',
    }[variant];

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={springPhysics}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </motion.button>
    );
  },
);

MotionButton.displayName = 'MotionButton';

export interface StatefulButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  state?: ButtonState;
  loadingText?: string;
  successText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const StatefulButton = React.forwardRef<HTMLButtonElement, StatefulButtonProps>(
  (
    {
      children,
      className = '',
      state = 'idle',
      loadingText = 'Signing in...',
      successText = 'Success',
      variant = 'primary',
      size = 'sm',
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isLoading = state === 'loading';
    const isSuccess = state === 'success';

    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const sizeClasses = {
      sm: 'text-xs px-3.5 py-2.5 h-9 gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2.5 h-10 gap-2 min-h-[40px]',
      lg: 'text-sm sm:text-base px-5 py-3 h-12 gap-2.5 min-h-[48px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-stone-950 text-white hover:bg-black focus-visible:ring-stone-900 shadow-sm shadow-stone-900/10 hover:shadow-md hover:shadow-stone-900/20',
      secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200/80 focus-visible:ring-stone-400',
      outline:
        'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 focus-visible:ring-stone-400 shadow-sm',
      ghost:
        'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
      danger:
        'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-500',
    }[variant];

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || isLoading || isSuccess}
        whileTap={{ scale: disabled || isLoading || isSuccess ? 1 : 0.98 }}
        transition={springPhysics}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
        )}
        {isSuccess && (
          <svg
            className="w-3.5 h-3.5 mr-1.5 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {isLoading ? loadingText : isSuccess ? successText : children}
      </motion.button>
    );
  },
);

StatefulButton.displayName = 'StatefulButton';
