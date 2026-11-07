import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ease } from './ease.js';

export interface SharedLayoutBgProps {
  children: React.ReactNode;
  className?: string;
  pillClassName?: string;
  inset?: number;
}

export const SharedLayoutBg: React.FC<SharedLayoutBgProps> = ({
  children,
  className = '',
  pillClassName = 'bg-stone-100 rounded-xl',
  inset = 0,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={`relative ${className}`} onMouseLeave={() => setHoveredIndex(null)}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement(child)) return child;

        const isHovered = hoveredIndex === index;

        return (
          <div
            key={child.key || index}
            className="relative"
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {isHovered && (
              <motion.div
                layoutId="shared-layout-pill"
                initial={false}
                transition={{ duration: 0.2, ease }}
                className={`absolute inset-0 pointer-events-none z-0 ${pillClassName}`}
                style={{
                  top: inset ? `${inset}px` : undefined,
                  bottom: inset ? `${inset}px` : undefined,
                }}
              />
            )}
            <div className="relative z-10">{child}</div>
          </div>
        );
      })}
    </div>
  );
};
