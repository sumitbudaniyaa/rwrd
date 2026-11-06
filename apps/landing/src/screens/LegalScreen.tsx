import React from 'react';

export interface LegalScreenProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({ title, subtitle, children }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">{title}</h1>
        <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
      </div>

      <div className="prose prose-stone text-xs text-stone-600 leading-relaxed space-y-4">
        {children || (
          <p>
            Detailed legal provisions and DPDP Act compliance documentation will be populated in
            Milestone 5 (M5-T05).
          </p>
        )}
      </div>
    </div>
  );
};
