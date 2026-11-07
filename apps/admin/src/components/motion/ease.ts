/**
 * beUI Motion Configuration Tokens
 * https://beui.dev/components/motion
 */

export const ease = [0.22, 1, 0.36, 1] as const;

export const springPhysics = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
} as const;

export const softSpring = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
} as const;

export const SPRING_LAYOUT = {
  type: 'spring',
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING_PRESS = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;
