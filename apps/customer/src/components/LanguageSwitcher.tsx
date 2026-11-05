import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const toggleLanguage = (lang: 'en' | 'hi') => {
    void i18n.changeLanguage(lang);
  };

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5 text-xs font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        className={`rounded-full px-2.5 py-1 transition-all ${
          currentLang === 'en'
            ? 'bg-white font-semibold text-stone-900 shadow-sm'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        aria-pressed={currentLang === 'en'}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage('hi')}
        className={`rounded-full px-2.5 py-1 transition-all ${
          currentLang === 'hi'
            ? 'bg-white font-semibold text-stone-900 shadow-sm'
            : 'text-stone-500 hover:text-stone-800'
        }`}
        aria-pressed={currentLang === 'hi'}
      >
        हिंदी
      </button>
    </div>
  );
};
