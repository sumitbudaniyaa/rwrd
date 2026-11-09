import React from 'react';
import { cn } from '@tiptable/ui';

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
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors duration-150',
        variantClasses,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
