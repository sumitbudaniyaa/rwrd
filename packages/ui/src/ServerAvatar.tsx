import React, { useState, useEffect } from 'react';
import { cn } from './motion.js';

export interface ServerAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  photoUrl?: string | null | undefined;
  name?: string | undefined;
  roleLabel?: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shape?: 'circle' | 'rounded' | 'square';
  imgClassName?: string;
  fallbackClassName?: string;
}

const sizeClasses: Record<NonNullable<ServerAvatarProps['size']>, string> = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  full: 'w-full h-full aspect-square',
};

const shapeClasses: Record<NonNullable<ServerAvatarProps['shape']>, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
  square: 'rounded-none',
};

/**
 * ServerDummyIllustration renders a warm, elegant hospitality server silhouette
 * matching the TipTable/rwrd design system (warm stone palette #F5F5F4, stone-400, stone-600).
 */
export const ServerDummyIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('w-full h-full select-none', className)}
    aria-hidden="true"
  >
    {/* Soft warm background */}
    <rect width="80" height="80" fill="#F5F5F4" />

    {/* Subtle depth vignette */}
    <circle cx="40" cy="36" r="32" fill="#E7E5E4" fillOpacity="0.45" />

    {/* Server shoulders / vest uniform */}
    <path
      d="M16 74C16 61.8497 25.8497 52 38 52H42C54.1503 52 64 61.8497 64 74V80H16V74Z"
      fill="#A8A29E"
    />

    {/* Server crisp inner collar / shirt (light stone) */}
    <path d="M32 52L40 63L48 52H32Z" fill="#FAFAF9" />

    {/* Server necktie / bowtie motif (hospitality touch) */}
    <path
      d="M37 54.5L40 56.5L43 54.5L41.5 58.5L43 62.5L40 60.5L37 62.5L38.5 58.5L37 54.5Z"
      fill="#57534E"
    />

    {/* Server neck */}
    <path d="M35 44H45V53C45 53 42.5 54 40 54C37.5 54 35 53 35 53V44Z" fill="#D6D3D1" />

    {/* Server head silhouette */}
    <ellipse cx="40" cy="33" rx="14" ry="16" fill="#78716C" />

    {/* Neat hair line contour */}
    <path
      d="M26 31C26 23.268 32.268 17 40 17C47.732 17 54 23.268 54 31C54 32.5 53.5 34 52.8 35.2C50.5 28.5 45.5 25.5 40 25.5C34.5 25.5 29.5 28.5 27.2 35.2C26.5 34 26 32.5 26 31Z"
      fill="#57534E"
    />
  </svg>
);

export const ServerAvatar: React.FC<ServerAvatarProps> = ({
  photoUrl,
  name,
  roleLabel,
  size = 'md',
  shape = 'rounded',
  className,
  imgClassName,
  fallbackClassName,
  ...props
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state if photoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const hasPhoto = Boolean(photoUrl && photoUrl.trim() !== '' && !imgError);

  const containerShape =
    shape === 'rounded' && size === 'full' ? 'rounded-2xl' : shapeClasses[shape];

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  return (
    <div
      className={cn(
        'relative overflow-hidden flex items-center justify-center flex-shrink-0 bg-stone-100 border border-stone-200/60 shadow-2xs select-none',
        sizeClasses[size],
        containerShape,
        className,
      )}
      role="img"
      aria-label={name ? `${name}${roleLabel ? ` - ${roleLabel}` : ''}` : 'Staff server avatar'}
      {...props}
    >
      {hasPhoto ? (
        <img
          src={photoUrl!}
          alt={name ? `${name}'s profile photo` : 'Staff profile photo'}
          loading="lazy"
          className={cn(
            'w-full h-full object-cover transition-transform duration-300',
            imgClassName,
          )}
          onError={() => setImgError(true)}
          data-testid="server-avatar-image"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center relative',
            fallbackClassName,
          )}
          data-testid="server-avatar-fallback"
        >
          <ServerDummyIllustration />
          {initials ? <span className="sr-only">{initials}</span> : null}
        </div>
      )}
    </div>
  );
};
