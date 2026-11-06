import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

export interface MenuItem {
  label: string;
  onClick?: () => void;
  active?: boolean | undefined;
}

export interface FloatingMenuProps {
  items?: MenuItem[];
}

function MenuButton({
  label,
  onClick,
  isOpen,
  index,
  active,
}: {
  label: string;
  onClick?: () => void;
  isOpen: boolean;
  index: number;
  active?: boolean | undefined;
}) {
  const [hovered, setHovered] = useState(false);
  const animatingRef = useRef(false);
  const pendingLeaveRef = useRef(false);
  const chars = label.split('');
  const lockDuration = 30 * chars.length + 300;

  const handleEnter = useCallback(() => {
    pendingLeaveRef.current = false;
    if (hovered) return;
    setHovered(true);
    animatingRef.current = true;
    setTimeout(() => {
      animatingRef.current = false;
      if (pendingLeaveRef.current) {
        pendingLeaveRef.current = false;
        setHovered(false);
      }
    }, lockDuration);
  }, [hovered, lockDuration]);

  const handleLeave = useCallback(() => {
    if (animatingRef.current) {
      pendingLeaveRef.current = true;
    } else {
      setHovered(false);
    }
  }, []);

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`text-[17px] sm:text-[20px] tracking-wide uppercase leading-none overflow-hidden cursor-pointer transition-colors relative ${
        active ? 'text-[#FFE862] font-black' : 'text-[#f7f1ed] font-semibold hover:text-white'
      }`}
      style={{
        fontFamily: "'Trobika', 'Bebas Neue', 'Poppins', 'Inter', sans-serif",
        letterSpacing: '-0.01em',
        height: '1.2em',
      }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{
        duration: 0.3,
        delay: isOpen ? 0.25 + 0.05 * index : 0,
        ease,
      }}
    >
      <span className="sr-only">{label}</span>
      <div className="flex justify-center items-center gap-1.5" aria-hidden="true">
        {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FFE862] inline-block mb-0.5" />}
        <div className="flex justify-center">
          {chars.map((char, i) => (
            <span key={i} className="inline-block overflow-hidden" style={{ height: '1.2em' }}>
              <span
                className="flex flex-col"
                style={{
                  transitionProperty: 'transform',
                  transitionDuration: hovered ? '800ms' : '0ms',
                  transitionDelay: hovered ? `${30 * i}ms` : '0ms',
                  transform: hovered ? 'translateY(-50%)' : 'translateY(0%)',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <span className="block" style={{ height: '1.2em', lineHeight: '1.2em' }}>
                  {char}
                </span>
                <span
                  className="block text-[#FFE862]"
                  style={{ height: '1.2em', lineHeight: '1.2em' }}
                  aria-hidden
                >
                  {char}
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

export function FloatingMenu({ items }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems: MenuItem[] = items ?? [
    { label: 'Home' },
    { label: 'Works' },
    { label: 'Contact' },
  ];

  const calculatedHeight = Math.max(260, 68 + menuItems.length * 36);

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

        {/* Menu items */}
        <div
          className="relative z-10 flex flex-col gap-3.5 items-center justify-center px-4"
          style={{
            pointerEvents: isOpen ? 'auto' : 'none',
            opacity: isOpen ? 1 : 0,
            flex: isOpen ? 1 : 0,
            overflow: 'hidden',
          }}
        >
          {menuItems.map((item, idx) => (
            <MenuButton
              key={item.label}
              label={item.label}
              onClick={() => {
                if (item.onClick) item.onClick();
                setIsOpen(false);
              }}
              isOpen={isOpen}
              index={idx}
              active={item.active}
            />
          ))}
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
