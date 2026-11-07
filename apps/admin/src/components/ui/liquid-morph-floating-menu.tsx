import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChromaticButton } from '../chromatic/chromatic-button.js';
import { SharedLayoutBg } from '../motion/shared-layout-bg.js';

const ease = [0.22, 1, 0.36, 1] as const;

export interface MenuItem {
  label: string;
  onClick?: () => void;
  active?: boolean | undefined;
  isDanger?: boolean | undefined;
}

export interface FloatingMenuProps {
  items?: MenuItem[];
}

export function FloatingMenu({ items }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems: MenuItem[] = items ?? [
    { label: 'Overview' },
    { label: 'Staff Roster' },
    { label: 'QR Management' },
    { label: 'Analytics' },
    { label: 'Settings' },
    { label: 'Audit Log' },
  ];

  const activeItem = menuItems.find((item) => item.active);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 left-1/2 z-[100] flex flex-col items-center"
      style={{
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        fontFamily: "'Aeonik TRIAL', 'Poppins', 'Inter', sans-serif",
      }}
    >
      {/* Floating Menu Card (always mounted for assistive tech and testability) */}
      <div
        className="w-[280px] bg-[#1c1c1c]/95 backdrop-blur-xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col gap-1 transition-all duration-300 ease-out"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          maxHeight: isOpen ? 500 : 0,
          padding: isOpen ? '12px' : '0 12px',
          marginBottom: isOpen ? 12 : 0,
          border: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : '0px solid transparent',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        }}
      >
        <SharedLayoutBg
          activeId={activeItem?.label ?? null}
          inset={0}
          pillClassName="bg-white/[0.08] rounded-[18px] border-0 shadow-none"
          className="flex flex-col gap-1 w-full"
        >
          {menuItems.map((item) => {
            const isActive = Boolean(item.active);
            return (
              <button
                key={item.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.onClick) item.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-[18px] cursor-pointer select-none transition-colors relative z-10 outline-none focus:outline-none"
              >
                <span
                  className={`text-sm tracking-wide uppercase transition-colors duration-150 ${
                    item.isDanger
                      ? 'text-rose-400 hover:text-rose-300 font-medium'
                      : isActive
                        ? 'text-[#FFE862] font-bold'
                        : 'text-stone-300 hover:text-white font-medium'
                  }`}
                  style={{ letterSpacing: '0.04em' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </SharedLayoutBg>
      </div>

      {/* Chromatic Menu Trigger Button */}
      <ChromaticButton
        color="#29a36870"
        colorMode="spectrum"
        speed={0.7}
        paused={false}
        phase={0}
        feather={100}
        projectionScale={174.7}
        intensity={1.4}
        grain={0.105}
        seed={7}
        borderRadius={50}
        hoverEffect="brighten"
        entrance="blur-up"
        entranceSpeed={1}
        entranceBlur={10}
        entranceDistance={20}
        entranceScale={0.65}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Navigation Menu"
        className="h-12 min-w-[155px] px-5 flex items-center justify-between gap-4 shadow-2xl cursor-pointer select-none"
      >
        <span className="font-bold text-[14px] md:text-[15px] select-none tracking-tight text-white drop-shadow-xs">
          {isOpen ? 'Close' : 'Menu'}
        </span>
        <div
          className="relative w-[20px] h-[20px] flex items-center justify-center"
          aria-hidden="true"
        >
          <motion.span
            className="absolute block w-[16px] h-[2px] rounded-full bg-white shadow-xs"
            animate={{
              rotate: isOpen ? 45 : 0,
              y: isOpen ? 0 : -3,
            }}
            transition={{ duration: 0.3, ease }}
          />
          <motion.span
            className="absolute block w-[16px] h-[2px] rounded-full bg-white shadow-xs"
            animate={{
              rotate: isOpen ? -45 : 0,
              y: isOpen ? 0 : 3,
            }}
            transition={{ duration: 0.3, ease }}
          />
        </div>
      </ChromaticButton>
    </div>
  );
}

export default FloatingMenu;
