import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none select-none items-center ${
        isDark
          ? 'bg-stone-800 border-stone-700 text-stone-300'
          : 'bg-stone-200 border-stone-300/80 text-stone-600'
      } ${className}`}
    >
      {/* Background Track Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <HugeiconsIcon
          icon={Sun01Icon}
          className={`w-3 h-3 transition-opacity duration-200 ${
            isDark ? 'opacity-30 text-stone-500' : 'opacity-80 text-amber-600'
          }`}
          strokeWidth={1.5}
        />
        <HugeiconsIcon
          icon={Moon02Icon}
          className={`w-3 h-3 transition-opacity duration-200 ${
            isDark ? 'opacity-90 text-amber-400' : 'opacity-30 text-stone-400'
          }`}
          strokeWidth={1.5}
        />
      </div>

      {/* Sliding Thumb */}
      <span
        className={`pointer-events-none inline-flex h-4.5 w-4.5 transform rounded-full bg-white dark:bg-stone-900 shadow-sm transition-transform duration-200 ease-in-out items-center justify-center border border-stone-200/80 dark:border-stone-700 ${
          isDark ? 'translate-x-5.5' : 'translate-x-0.5'
        }`}
      >
        <HugeiconsIcon
          icon={isDark ? Moon02Icon : Sun01Icon}
          className={`w-2.5 h-2.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
          strokeWidth={1.5}
        />
      </span>
    </button>
  );
};
