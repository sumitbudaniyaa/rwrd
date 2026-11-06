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
