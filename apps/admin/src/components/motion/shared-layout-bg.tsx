import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useId,
  useState,
} from 'react';
import { SPRING_LAYOUT } from './ease.js';
import { cn } from '../../lib/utils.js';

export interface SharedLayoutBgProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  /** Semantic container used for the children. */
  as?: 'div' | 'ul';
  /** Tailwind class applied to the moving pill. */
  pillClassName?: string;
  /** Horizontal inset of the pill relative to each row (px). Default 12. */
  inset?: number;
  /** Optional positioning override for the pill wrapper inside each item. */
  pillContainerClassName?: string;
  /** Optional layoutId override so multiple groups can share the same moving pill */
  layoutId?: string;
  /** Optional active/selected item key to highlight when not hovering or on keyboard navigation */
  activeId?: string | null;
  /** Optional callback when item is hovered or cleared */
  onHoverChange?: (id: string | null) => void;
}

const variants: Variants = {
  initial: { opacity: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: (isActive: boolean) => (!isActive ? { opacity: 0, filter: 'blur(6px)' } : {}),
};

const reducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: (isActive: boolean) => (!isActive ? { opacity: 0 } : {}),
};

export const SharedLayoutBg = forwardRef<HTMLElement, SharedLayoutBgProps>(function SharedLayoutBg(
  {
    children,
    as = 'div',
    className,
    onMouseLeave,
    pillClassName,
    pillContainerClassName,
    inset = 12,
    layoutId,
    activeId,
    onHoverChange,
    ...props
  },
  forwardedRef,
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const uid = useId();
  const reduce = useReducedMotion();
  const activeLayoutId = layoutId || `shared-bg-${uid}`;

  const effectiveActiveId = hoveredId !== null ? hoveredId : (activeId ?? null);

  const renderedChildren = Children.toArray(children)
    .filter(isValidElement)
    .map((child, index) => {
      const el = child as ReactElement<{
        className?: string;
        onMouseEnter?: () => void;
        children?: ReactNode;
        'data-no-hover'?: boolean | string;
      }>;
      if (el.props['data-no-hover']) {
        return el;
      }
      const childKey = el.key ? String(el.key).replace(/^\.\$/, '') : `item-${index}`;
      const isHighlighted = effectiveActiveId === childKey;

      return cloneElement(
        el,
        {
          key: childKey,
          className: cn('relative z-0', el.props.className),
          onMouseEnter: () => {
            el.props.onMouseEnter?.();
            setHoveredId(childKey);
            onHoverChange?.(childKey);
          },
        },
        <>
          <AnimatePresence custom={isHighlighted}>
            {isHighlighted ? (
              <motion.div
                variants={reduce ? reducedVariants : variants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={isHighlighted}
                className={cn('pointer-events-none absolute inset-y-0 z-0', pillContainerClassName)}
                style={{ left: -inset, right: -inset }}
              >
                <motion.div
                  layoutId={activeLayoutId}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className={cn(
                    'pointer-events-none h-full w-full rounded-xl bg-stone-100/90 border border-stone-200/50 shadow-2xs',
                    pillClassName,
                  )}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          {el.props.children}
        </>,
      );
    });

  const handleMouseLeave = (event: MouseEvent<Element>) => {
    setHoveredId(null);
    onHoverChange?.(null);
    (onMouseLeave as unknown as ((e: MouseEvent<Element>) => void) | undefined)?.(event);
  };

  return as === 'ul' ? (
    <motion.ul
      {...(props as unknown as HTMLMotionProps<'ul'>)}
      ref={forwardedRef as Ref<HTMLUListElement>}
      layoutRoot
      onMouseLeave={handleMouseLeave}
      className={cn('flex w-full flex-col', className)}
    >
      {renderedChildren}
    </motion.ul>
  ) : (
    <motion.div
      {...props}
      ref={forwardedRef as Ref<HTMLDivElement>}
      layoutRoot
      onMouseLeave={handleMouseLeave}
      className={cn('flex w-full flex-col', className)}
    >
      {renderedChildren}
    </motion.div>
  );
});
