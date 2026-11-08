import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { QrCodeIcon } from '@hugeicons/core-free-icons';
import rwrdLogo from '../assets/rwrd.png';

export const NoTokenScreen: React.FC = () => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-[420px] mx-auto w-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FFE862]/25 border border-[#FFE862]/50 flex items-center justify-center text-stone-900 shadow-2xs mb-4">
        <HugeiconsIcon icon={QrCodeIcon} className="w-8 h-8 text-stone-900" strokeWidth={1.5} />
      </div>

      <h1 className="font-serif text-2xl font-normal text-stone-900 tracking-tight">
        scan table QR code
      </h1>
      <p className="mt-2 text-xs text-stone-500 leading-relaxed font-sans max-w-xs">
        To view your restaurant waiter roster and tip directly via UPI, please scan the QR placard
        on your dining table with your phone camera or QR scanner.
      </p>

      <div className="mt-8 p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs w-full text-left space-y-2">
        <p className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider font-sans">
          How it works
        </p>
        <ol className="text-xs text-stone-600 space-y-1.5 list-decimal list-inside leading-relaxed font-sans">
          <li>Point your phone camera at the table QR code.</li>
          <li>Tap the link to open your server&apos;s profile.</li>
          <li>Choose an amount and pay directly with your UPI app.</li>
        </ol>
      </div>

      <footer className="mt-12 text-center">
        <span className="sr-only">rwrd</span>
        <img
          src={rwrdLogo}
          alt="rwrd"
          className="h-8 w-auto object-contain mx-auto opacity-80 select-none"
        />
      </footer>
    </main>
  );
};
