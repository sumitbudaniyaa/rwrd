import React, { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Hook to detect whether the user has requested reduced motion.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}

/**
 * FadeIn motion primitive: gentle opacity transition.
 */
export interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  delay?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  className,
  duration = 200,
  delay = 0,
  style,
  ...props
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn('transition-opacity ease-out', className)}
      style={{
        transitionDuration: reducedMotion ? '0ms' : `${duration}ms`,
        transitionDelay: reducedMotion ? '0ms' : `${delay}ms`,
        opacity: 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * SlideUp motion primitive: subtle upward translation and fade.
 */
export interface SlideUpProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  delay?: number;
  offsetY?: number;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  className,
  duration = 250,
  delay = 0,
  offsetY = 8,
  style,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn('transition-all ease-out', className)}
      style={{
        transitionDuration: reducedMotion ? '0ms' : `${duration}ms`,
        transitionDelay: reducedMotion ? '0ms' : `${delay}ms`,
        opacity: mounted || reducedMotion ? 1 : 0,
        transform: mounted || reducedMotion ? 'translateY(0)' : `translateY(${offsetY}px)`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ScaleIn motion primitive: gentle pop entrance (0.97 -> 1).
 */
export interface ScaleInProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  delay?: number;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  className,
  duration = 200,
  delay = 0,
  style,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn('transition-all ease-out', className)}
      style={{
        transitionDuration: reducedMotion ? '0ms' : `${duration}ms`,
        transitionDelay: reducedMotion ? '0ms' : `${delay}ms`,
        opacity: mounted || reducedMotion ? 1 : 0,
        transform: mounted || reducedMotion ? 'scale(1)' : 'scale(0.97)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * StaggerList motion primitive: staggers the entrance of child elements.
 */
export interface StaggerListProps extends React.HTMLAttributes<HTMLDivElement> {
  staggerIntervalMs?: number;
}

export const StaggerList: React.FC<StaggerListProps> = ({
  children,
  className,
  staggerIntervalMs = 40,
  ...props
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <SlideUp delay={reducedMotion ? 0 : index * staggerIntervalMs} key={child.key || index}>
            {child}
          </SlideUp>
        );
      })}
    </div>
  );
};

/**
 * MotionButton: minimal interactive button adhering to the TipTable minimal design standards.
 * Pure white/solid surfaces, single accent focus ring, 48px accessible tap targets, micro scale tap.
 */
export interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      children,
      className,
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
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2.5 h-10 gap-2 min-h-[44px]',
      lg: 'text-base px-5 py-3 h-12 gap-2.5 min-h-[48px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-stone-900 border border-transparent shadow-sm',
      secondary:
        'bg-stone-100 text-stone-800 hover:bg-stone-200 focus-visible:ring-stone-400 border border-transparent',
      outline:
        'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 focus-visible:ring-stone-400 shadow-sm',
      ghost:
        'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400',
      danger:
        'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-500',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseClasses, sizeClasses, variantClasses, className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  },
);

MotionButton.displayName = 'MotionButton';

/**
 * MotionCard: pure white background, minimal light border, zero heavy shadows, light solid tints.
 */
export interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-stone-200 rounded-2xl p-6 transition-all duration-150',
        hoverable && 'hover:border-stone-300 hover:shadow-sm active:scale-[0.995]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Badge: minimal solid light tint chips for statuses and metrics.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  ...props
}) => {
  const variantClasses = {
    neutral:
      'bg-stone-500/10 text-stone-700 border-stone-500/20 dark:bg-stone-500/15 dark:text-stone-300 dark:border-stone-500/25',
    success:
      'bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
    warning:
      'bg-amber-500/10 text-amber-800 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
    danger:
      'bg-rose-500/10 text-rose-800 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25',
    accent:
      'bg-stone-500/10 text-stone-800 border-stone-500/20 dark:bg-stone-500/15 dark:text-stone-200 dark:border-stone-500/25',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantClasses,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
