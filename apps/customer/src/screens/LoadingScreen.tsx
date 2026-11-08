import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
      <div className="w-16 h-16 rounded-full bg-stone-200/70 mb-6" />
      <div className="h-6 w-48 bg-stone-200/70 rounded-lg mb-3" />
      <div className="h-4 w-32 bg-stone-200/50 rounded-lg mb-8" />

      <div className="w-full max-w-sm space-y-3.5">
        <div className="h-28 bg-white border border-stone-200/60 rounded-2xl shadow-2xs" />
        <div className="h-28 bg-white border border-stone-200/60 rounded-2xl shadow-2xs" />
      </div>
    </div>
  );
};
