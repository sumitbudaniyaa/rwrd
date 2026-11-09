import React, { useState, useEffect, useCallback } from 'react';
import { LiquidGlassLogo } from './liquid-glass-logo.js';
import rwrdLogo from '../assets/rwrd.png';

interface LiquidGlassIntroProps {
  onComplete?: () => void;
}

export const LiquidGlassIntro: React.FC<LiquidGlassIntroProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(() => import.meta.env.MODE !== 'test');
  const [isFading, setIsFading] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isFading || !isVisible) return;
    setIsFading(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 600);
    return () => clearTimeout(timer);
  }, [isFading, isVisible, onComplete]);

  useEffect(() => {
    // Skip intro in test environment to avoid blocking test runners
    if (import.meta.env.MODE === 'test') {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Check for reduced motion preference
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Logo entrance animation finishes at ~1.8s.
    // Hold the pristine rested logo for 600ms, then initiate cinematic dissolve.
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 2400);

    return () => clearTimeout(autoDismissTimer);
  }, [handleDismiss, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] bg-[#FAFAF9] flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="banner"
      aria-label="Welcome to rwrd"
    >
      <div className="w-full max-w-[420px] flex items-center justify-center p-4">
        <LiquidGlassLogo
          logo={rwrdLogo}
          ending="logo"
          theme="light"
          background="#FAFAF9"
          tileColor="#F5F5F4"
          logoColor="original"
          logoScale={0.82}
          logoRelief={0.2}
          style={{ height: 480, width: '100%', maxWidth: 420 }}
        />
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-[11px] font-sans tracking-widest uppercase text-stone-400 opacity-70 hover:opacity-100 transition-opacity">
          Tap anywhere to skip
        </p>
      </div>
    </div>
  );
};
