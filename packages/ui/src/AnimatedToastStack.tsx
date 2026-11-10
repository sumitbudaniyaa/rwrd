import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  AlertSquareIcon,
  Shield01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: ReactNode;
  description?: ReactNode | undefined;
  type: ToastType;
  duration?: number | undefined;
  action?: ToastAction | undefined;
  createdAt: number;
}

export interface ShowToastOptions {
  id?: string | undefined;
  title: ReactNode;
  description?: ReactNode | undefined;
  type?: ToastType | undefined;
  duration?: number | undefined;
  action?: ToastAction | undefined;
}

export interface UseAnimatedToastStackOptions {
  defaultDuration?: number;
  limit?: number;
}

const DEFAULT_DURATION = 4200;
const MAX_STACK_VISIBLE = 3;

export function useAnimatedToastStack(options?: UseAnimatedToastStackOptions) {
  const defaultDuration = options?.defaultDuration ?? DEFAULT_DURATION;
  const limit = options?.limit ?? 10;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (opts: ShowToastOptions): string => {
      const id = opts.id || Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        title: opts.title,
        description: opts.description,
        type: opts.type || 'info',
        duration: opts.duration !== undefined ? opts.duration : defaultDuration,
        action: opts.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        const updated = [newToast, ...filtered];
        return updated.slice(0, limit);
      });

      return id;
    },
    [defaultDuration, limit],
  );

  const updateToast = useCallback(
    (id: string, updates: Partial<Omit<Toast, 'id' | 'createdAt'>>) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            ...updates,
          };
        }),
      );
    },
    [],
  );

  // Auto-dismiss management with hover pause
  useEffect(() => {
    if (isHovered) {
      // Pause timers while hovered
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      return;
    }

    toasts.forEach((t) => {
      if (t.type === 'loading' || t.duration === 0) return;
      if (!timersRef.current.has(t.id)) {
        const remaining = Math.max(0, (t.duration || defaultDuration) - (Date.now() - t.createdAt));
        const timer = setTimeout(() => {
          dismissToast(t.id);
        }, remaining);
        timersRef.current.set(t.id, timer);
      }
    });

    return () => {
      // Cleanup on unmount or change
    };
  }, [toasts, isHovered, defaultDuration, dismissToast]);

  return {
    toasts,
    showToast,
    updateToast,
    dismissToast,
    clearToasts,
    isHovered,
    setIsHovered,
  };
}

export interface AnimatedToastStackProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?:
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
  maxVisible?: number;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

export const AnimatedToastStack: React.FC<AnimatedToastStackProps> = ({
  toasts,
  onDismiss,
  position = 'bottom-right',
  maxVisible = MAX_STACK_VISIBLE,
  isHovered: externalHovered,
  onHoverChange,
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = externalHovered !== undefined ? externalHovered : internalHovered;

  const handleMouseEnter = () => {
    setInternalHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setInternalHovered(false);
    onHoverChange?.(false);
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6 items-end',
    'bottom-left': 'bottom-6 left-6 items-start',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2 items-center',
    'top-right': 'top-6 right-6 items-end',
    'top-left': 'top-6 left-6 items-start',
    'top-center': 'top-6 left-1/2 -translate-x-1/2 items-center',
  }[position];

  const getStatusIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={1.5} />
          </div>
        );
      case 'error':
        return (
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" strokeWidth={1.5} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={AlertSquareIcon} className="w-4 h-4" strokeWidth={1.5} />
          </div>
        );
      case 'loading':
        return (
          <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-stone-800 dark:border-stone-200 border-t-transparent rounded-full animate-spin" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" strokeWidth={1.5} />
          </div>
        );
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notification toasts"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed z-[300] flex flex-col pointer-events-none ${positionClasses}`}
    >
      <div className="relative flex flex-col-reverse items-end">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            if (!isHovered && index >= maxVisible) return null;

            const isTop = index === 0;
            const collapsedOffset = index * 10;
            const expandedOffset = index * 68;
            const yOffset = isHovered ? -expandedOffset : -collapsedOffset;
            const scale = isHovered ? 1 : 1 - index * 0.04;
            const opacity = isHovered ? 1 : index === 0 ? 1 : index === 1 ? 0.9 : 0.75;
            const zIndex = isHovered ? 100 - index : maxVisible - index;

            return (
              <motion.div
                key={toast.id}
                layout="position"
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{
                  opacity,
                  y: yOffset,
                  scale,
                  zIndex,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.85,
                  transition: { duration: 0.2 },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32,
                  mass: 0.8,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 300 }}
                dragElastic={{ left: 0.05, right: 0.7 }}
                onDragEnd={(_: unknown, info: PanInfo) => {
                  if (info.offset.x > 80 || info.velocity.x > 400) {
                    onDismiss(toast.id);
                  }
                }}
                className={`pointer-events-auto select-none rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl dark:shadow-stone-950/60 p-4 max-w-sm w-full min-w-[320px] transition-colors duration-200 cursor-grab active:cursor-grabbing backdrop-blur-md ${
                  !isTop && !isHovered ? 'pointer-events-none' : ''
                }`}
                style={{
                  position: isHovered ? 'relative' : index === 0 ? 'relative' : 'absolute',
                  bottom: 0,
                }}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(toast.type)}

                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate leading-snug">
                      {toast.title}
                    </p>
                    {toast.description && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed line-clamp-2">
                        {toast.description}
                      </p>
                    )}
                    {toast.action && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.action?.onClick();
                        }}
                        className="mt-2 text-xs font-semibold text-stone-900 dark:text-stone-100 underline hover:no-underline cursor-pointer"
                      >
                        {toast.action.label}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(toast.id);
                    }}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                    aria-label="Dismiss toast"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Global Toast Context & Provider for convenience
export interface ToastContextValue {
  showToast: (opts: ShowToastOptions) => string;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id' | 'createdAt'>>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  toast: {
    success: (title: ReactNode, description?: ReactNode, duration?: number) => string;
    error: (title: ReactNode, description?: ReactNode, duration?: number) => string;
    warning: (title: ReactNode, description?: ReactNode, duration?: number) => string;
    info: (title: ReactNode, description?: ReactNode, duration?: number) => string;
    loading: (title: ReactNode, description?: ReactNode) => string;
    dismiss: (id: string) => void;
    clear: () => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  position?:
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
  defaultDuration?: number;
  limit?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'bottom-right',
  defaultDuration = DEFAULT_DURATION,
  limit = 10,
}) => {
  const { toasts, showToast, updateToast, dismissToast, clearToasts, isHovered, setIsHovered } =
    useAnimatedToastStack({ defaultDuration, limit });

  const toastHelpers = {
    success: (title: ReactNode, description?: ReactNode, duration?: number) =>
      showToast({ title, description, type: 'success', duration }),
    error: (title: ReactNode, description?: ReactNode, duration?: number) =>
      showToast({ title, description, type: 'error', duration }),
    warning: (title: ReactNode, description?: ReactNode, duration?: number) =>
      showToast({ title, description, type: 'warning', duration }),
    info: (title: ReactNode, description?: ReactNode, duration?: number) =>
      showToast({ title, description, type: 'info', duration }),
    loading: (title: ReactNode, description?: ReactNode) =>
      showToast({ title, description, type: 'loading', duration: 0 }),
    dismiss: dismissToast,
    clear: clearToasts,
  };

  const value: ToastContextValue = {
    showToast,
    updateToast,
    dismissToast,
    clearToasts,
    toast: toastHelpers,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatedToastStack
            toasts={toasts}
            onDismiss={dismissToast}
            position={position}
            isHovered={isHovered}
            onHoverChange={setIsHovered}
          />,
          document.body,
        )}
    </ToastContext.Provider>
  );
};

const NOOP_TOAST_CONTEXT: ToastContextValue['toast'] & {
  showToast: ToastContextValue['showToast'];
  updateToast: ToastContextValue['updateToast'];
} = {
  success: () => 'noop',
  error: () => 'noop',
  warning: () => 'noop',
  info: () => 'noop',
  loading: () => 'noop',
  dismiss: () => {},
  clear: () => {},
  showToast: () => 'noop',
  updateToast: () => {},
};

export function useToast(): ToastContextValue['toast'] & {
  showToast: ToastContextValue['showToast'];
  updateToast: ToastContextValue['updateToast'];
} {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return NOOP_TOAST_CONTEXT;
  }

  return {
    ...ctx.toast,
    showToast: ctx.showToast,
    updateToast: ctx.updateToast,
  };
}
