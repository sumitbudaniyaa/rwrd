import React from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert01Icon } from '@hugeicons/core-free-icons';

interface ErrorScreenProps {
  title?: string;
  message?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, message }) => {
  const { t } = useTranslation();
  const displayTitle = title || t('common.error_table_unavailable');
  const displayMessage = message || t('common.error_table_unavailable_desc');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAFAF9]">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200/80 flex items-center justify-center mb-6 text-stone-600 shadow-2xs">
        <HugeiconsIcon icon={Alert01Icon} className="w-8 h-8 text-stone-600" strokeWidth={1.5} />
      </div>

      <h1 className="font-serif text-2xl font-normal text-stone-900 mb-3 tracking-tight">
        {displayTitle}
      </h1>

      <p className="text-sm text-stone-500 font-sans max-w-xs leading-relaxed mb-8">
        {displayMessage}
      </p>

      <p className="text-xs text-stone-400 font-sans">{t('common.error_ask_server')}</p>
    </div>
  );
};
