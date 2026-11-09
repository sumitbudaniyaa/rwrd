import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer select-none ${
        compact ? 'p-1.5' : 'w-full px-2.5 py-1.5'
      } ${
        isDark
          ? 'bg-stone-800/90 hover:bg-stone-800 border-stone-700/80 text-stone-200'
          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
      } ${className}`}
    >
      <HugeiconsIcon
        icon={isDark ? Sun01Icon : Moon02Icon}
        className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-stone-500'}`}
        strokeWidth={1.5}
      />
      {!compact && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
    </button>
  );
};
