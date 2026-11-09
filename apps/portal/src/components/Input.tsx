import React, { useId, useState } from 'react';
import { FadeIn } from '@tiptable/ui';

export interface InputProps {
  id?: string;
  label?: string;
  type?: string;
  sizeVariant?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
  className?: string;
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
  disabled = false,
  autoComplete,
  required = false,
  className = '',
}) => {
  const generatedId = useId();
  const [isFocused, setIsFocused] = useState(false);
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
          className="block text-[11px] font-medium text-stone-600 dark:text-stone-300 mb-1 select-none"
        >
          {label}
        </label>
      )}

      <div
        className={`relative flex items-center w-full rounded-xl transition-all duration-200 ease-out border ${
          error
            ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]'
            : isFocused
              ? 'border-stone-400 dark:border-stone-500 bg-white dark:bg-stone-900 shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]'
              : 'border-stone-200/90 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/70 dark:bg-stone-900/60'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {hasLeftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:outline-none focus:ring-0 ${sizeClasses} ${hasLeftIcon ? 'pl-8' : ''} ${hasRightIcon ? 'pr-8' : ''}`}
        />

        {hasRightIcon && <div className="absolute right-2.5 flex items-center">{rightIcon}</div>}
      </div>

      {error && (
        <div className="min-h-[16px] mt-0.5">
          <FadeIn duration={150}>
            <p
              id={errorId}
              className="text-[10px] text-rose-600 dark:text-rose-400 font-medium pl-0.5"
            >
              {error}
            </p>
          </FadeIn>
        </div>
      )}
    </div>
  );
};
