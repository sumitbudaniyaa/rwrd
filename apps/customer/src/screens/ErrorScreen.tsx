import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorScreenProps {
  title?: string;
  message?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, message }) => {
  const { t } = useTranslation();
  const displayTitle = title || t('common.error_table_unavailable');
  const displayMessage = message || t('common.error_table_unavailable_desc');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-cream-50">
      <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mb-6 text-charcoal-500">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="font-serif text-2xl font-normal text-charcoal-900 mb-3 tracking-tight">
        {displayTitle}
      </h1>

      <p className="text-sm text-charcoal-500 max-w-xs leading-relaxed mb-8">{displayMessage}</p>

      <p className="text-xs text-charcoal-400">{t('common.error_ask_server')}</p>
    </div>
  );
};
