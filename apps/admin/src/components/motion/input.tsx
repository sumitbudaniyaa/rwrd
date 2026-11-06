import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface InputProps {
  id?: string | undefined;
  label?: string | undefined;
  type?: string | undefined;
  sizeVariant?: 'sm' | 'md' | 'lg' | undefined;
  placeholder?: string | undefined;
  leftIcon?: React.ReactNode | undefined;
  rightIcon?: React.ReactNode | undefined;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (() => void) | undefined;
  error?: string | undefined;
  reserveErrorLine?: boolean | undefined;
  disabled?: boolean | undefined;
  autoComplete?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  type = 'text',
  sizeVariant = 'sm',
  placeholder,
  leftIcon,
  rightIcon,
  value,
  onChange,
  onBlur,
  error,
  reserveErrorLine = false,
  disabled = false,
  autoComplete,
  required = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
  const errorId = `${inputId}-error`;

  const sizeClasses = {
    sm: 'text-xs px-3 py-2 h-9',
    md: 'text-xs sm:text-sm px-3.5 py-2.5 h-10',
    lg: 'text-sm sm:text-base px-4 py-3 h-12',
  }[sizeVariant];

  const hasLeftIcon = Boolean(leftIcon);
  const hasRightIcon = Boolean(rightIcon);

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-medium text-stone-600 mb-1 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {hasLeftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-stone-400">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl bg-stone-50/80 border text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-stone-200/90 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
          } ${sizeClasses} ${hasLeftIcon ? 'pl-8' : ''} ${hasRightIcon ? 'pr-8' : ''}`}
        />

        {hasRightIcon && <div className="absolute right-2.5 flex items-center">{rightIcon}</div>}
      </div>

      {(error || reserveErrorLine) && (
        <div className="min-h-[16px] mt-0.5">
          <AnimatePresence initial={false}>
            {error && (
              <motion.p
                id={errorId}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] text-rose-600 font-medium pl-0.5"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
