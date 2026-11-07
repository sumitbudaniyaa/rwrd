import React from 'react';

export const NoTokenScreen: React.FC = () => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-[420px] mx-auto w-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center text-charcoal-700 shadow-xs mb-4">
        <svg
          className="w-8 h-8 text-charcoal-800"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3v3h-3v-3zM16.5 16.5h3v3h-3v-3zM13.5 19.5h3v.75h-3v-.75zM19.5 13.5h.75v3h-.75v-3z"
          />
        </svg>
      </div>

      <h1 className="font-serif text-2xl font-normal text-charcoal-900 tracking-tight">
        scan table QR code
      </h1>
      <p className="mt-2 text-xs text-charcoal-500 leading-relaxed font-sans max-w-xs">
        To view your restaurant waiter roster and tip directly via UPI, please scan the QR placard
        on your dining table with your phone camera or QR scanner.
      </p>

      <div className="mt-8 p-4 rounded-2xl bg-cream-100/70 border border-cream-200/80 w-full text-left space-y-2">
        <p className="text-[11px] font-semibold text-charcoal-700 uppercase tracking-wider">
          How it works
        </p>
        <ol className="text-xs text-charcoal-600 space-y-1 list-decimal list-inside leading-relaxed">
          <li>Point your phone camera at the table QR code.</li>
          <li>Tap the link to open your server&apos;s profile.</li>
          <li>Choose an amount and pay directly with your UPI app.</li>
        </ol>
      </div>

      <footer className="mt-12 text-center">
        <p className="text-[11px] text-charcoal-400">
          Powered by rwrd • Safe & Direct Peer-to-Peer
        </p>
      </footer>
    </main>
  );
};
