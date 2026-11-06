import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ease } from './ease.js';

export type AlertVariant = 'info' | 'destructive' | 'success' | 'warning';

export interface AlertProps {
  variant?: AlertVariant;
  open?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  role?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string }> = {
  info: {
    bg: 'bg-blue-50/90',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  destructive: {
    bg: 'bg-rose-50/90',
    border: 'border-rose-200',
    text: 'text-rose-800',
  },
  success: {
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50/90',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  open = true,
  onClose,
  children,
  className = '',
  role,
}) => {
  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role={role || (variant === 'destructive' ? 'alert' : 'status')}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.2, ease }}
          className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs leading-relaxed font-medium ${styles.bg} ${styles.border} ${styles.text} ${className}`}
        >
          <div className="flex-1 flex items-start gap-2.5">{children}</div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss alert"
              className="p-1 -mr-1 -mt-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const AlertTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`font-semibold leading-snug mb-0.5 ${className}`}>{children}</div>;

export const AlertDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`text-xs opacity-90 leading-relaxed ${className}`}>{children}</div>;

export const AlertIcon: React.FC<{ variant?: AlertVariant; className?: string }> = ({
  variant = 'info',
  className = 'w-4 h-4 shrink-0 mt-0.5',
}) => {
  if (variant === 'destructive') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  if (variant === 'success') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
};
