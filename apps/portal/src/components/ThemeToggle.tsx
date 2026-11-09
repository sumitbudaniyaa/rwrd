import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', size = 'sm' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`${sizeClasses} rounded-full border flex items-center justify-center transition-colors cursor-pointer select-none shrink-0 ${
        isDark
          ? 'bg-stone-800/90 hover:bg-stone-700 border-stone-700/80 text-amber-400'
          : 'bg-stone-100/80 hover:bg-stone-200/90 border-stone-200 text-stone-600'
      } ${className}`}
    >
      <HugeiconsIcon
        icon={isDark ? Sun01Icon : Moon02Icon}
        className="w-3.5 h-3.5 pointer-events-none"
        strokeWidth={1.5}
      />
    </button>
  );
};
