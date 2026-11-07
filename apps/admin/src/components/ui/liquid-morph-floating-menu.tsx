import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const calculatedHeight = Math.max(300, 76 + menuItems.length * 42);

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
    <motion.div
      ref={containerRef}
      className="fixed bottom-6 left-1/2 z-[100]"
      style={{ x: '-50%', pointerEvents: 'auto' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <motion.div
        className="relative overflow-hidden flex flex-col shadow-2xl"
        onClick={() => {
          if (!isOpen) setIsOpen(true);
        }}
        style={{
          fontFamily: "'Aeonik TRIAL', 'Poppins', 'Inter', sans-serif",
          letterSpacing: '-0.02em',
          cursor: isOpen ? 'default' : 'pointer',
        }}
        animate={{
          width: isOpen ? 290 : 145,
          height: isOpen ? calculatedHeight : 48,
          borderRadius: isOpen ? 32 : 72,
          scale: 1,
        }}
        whileHover={!isOpen ? { scale: 1.05 } : {}}
        transition={{
          duration: 0.6,
          ease,
          height: { duration: isOpen ? 0.6 : 0.2 },
          scale: { duration: 0.25, ease },
        }}
      >
        {/* Yellow background layer */}
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundColor: isOpen ? '#FFE862' : '#FFE862',
            borderColor: isOpen ? '#FFE862' : '#d1bb3b',
          }}
          transition={{ duration: isOpen ? 0.1 : 0.3, ease }}
          style={{
            borderWidth: 1,
            borderStyle: 'solid',
            borderRadius: 'inherit',
          }}
        />

        {/* Dark circle expanding from bottom */}
        <motion.div
          className="absolute left-1/2 bg-[#242424]"
          style={{
            width: '240%',
            height: '240%',
            borderRadius: '50%',
            x: '-50%',
          }}
          animate={{ bottom: isOpen ? '-20%' : '-240%' }}
          transition={{
            duration: 0.6,
            ease,
            delay: isOpen ? 0.05 : 0,
          }}
        />

        {/* Menu items with SharedLayoutBg gliding hover */}
        <div
          className="relative z-10 flex flex-col items-center justify-center w-full px-4"
          style={{
            pointerEvents: isOpen ? 'auto' : 'none',
            opacity: isOpen ? 1 : 0,
            flex: isOpen ? 1 : 0,
            overflow: 'hidden',
            maxHeight: isOpen ? 500 : 0,
            paddingTop: isOpen ? 20 : 0,
            paddingBottom: isOpen ? 8 : 0,
            transition: 'opacity 0.25s ease, max-height 0.3s ease, padding 0.3s ease',
          }}
        >
          <SharedLayoutBg
            activeId={isOpen ? (activeItem?.label ?? null) : null}
            inset={0}
            pillClassName="bg-white/[0.07] rounded-[20px] border-0 border-none shadow-none"
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
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-[20px] cursor-pointer select-none transition-colors relative z-10 outline-none focus:outline-none"
                >
                  <span
                    className={`text-sm sm:text-[15px] tracking-wide uppercase transition-colors duration-200 ${
                      item.isDanger
                        ? 'text-rose-400 hover:text-rose-300 font-medium'
                        : isActive
                          ? 'text-[#FFE862] font-bold'
                          : 'text-stone-300 hover:text-white font-medium'
                    }`}
                    style={{
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </SharedLayoutBg>
        </div>

        {/* Bottom bar: Menu + hamburger */}
        <motion.div
          className="relative z-10 flex items-center justify-between w-full shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          animate={{
            paddingLeft: isOpen ? 24 : 18,
            paddingRight: isOpen ? 24 : 18,
            paddingBottom: isOpen ? 16 : 0,
            height: 48,
          }}
          transition={{ duration: 0.6, ease }}
          style={{ alignItems: 'center' }}
        >
          <motion.span
            className="text-[14px] md:text-[15px] leading-none font-bold select-none tracking-tight"
            animate={{ color: isOpen ? '#f7f1ed' : '#242424' }}
            transition={{ duration: 0.3, ease }}
          >
            {isOpen ? 'Close' : 'Menu'}
          </motion.span>

          <div className="relative w-[24px] h-[24px] flex items-center justify-center">
            <motion.span
              className="absolute block w-[18px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -3,
                backgroundColor: isOpen ? '#f7f1ed' : '#242424',
              }}
              transition={{ duration: 0.4, ease }}
            />
            <motion.span
              className="absolute block w-[18px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 3,
                backgroundColor: isOpen ? '#f7f1ed' : '#242424',
              }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default FloatingMenu;
