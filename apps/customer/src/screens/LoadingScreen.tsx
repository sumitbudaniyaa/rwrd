import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
      <div className="w-16 h-16 rounded-full bg-cream-300/60 mb-6" />
      <div className="h-6 w-48 bg-cream-300/60 rounded mb-3" />
      <div className="h-4 w-32 bg-cream-300/40 rounded mb-8" />

      <div className="w-full max-w-sm space-y-4">
        <div className="h-32 bg-cream-200/70 rounded-2xl" />
        <div className="h-32 bg-cream-200/70 rounded-2xl" />
      </div>
    </div>
  );
};
