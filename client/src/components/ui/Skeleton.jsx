import { forwardRef } from 'react';

// ─── Shimmer style ────────────────────────────────────────────────────────────
// bg-surface-hover provides the base tint; the backgroundImage gradient rides on
// top (CSS stacking: color below image) creating the moving glint effect.
const shimmerStyle = {
  backgroundImage:
    'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.04) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
};

// ─── Base Skeleton ────────────────────────────────────────────────────────────

/**
 * Skeleton — single animated placeholder block.
 *
 * @param {string}  variant  'text' | 'title' | 'avatar' | 'card' | 'image'
 * @param {string|number} width    CSS width (default '100%')
 * @param {number}  height   pixel height (used for text/title/card; ignored for avatar/image)
 * @param {number}  size     diameter in px for variant='avatar' (default 40)
 * @param {number}  count    render N text skeletons stacked (default 1)
 * @param {string}  className extra Tailwind classes
 */
const Skeleton = forwardRef(function Skeleton(
  {
    variant = 'text',
    width = '100%',
    height,
    size = 40,
    count = 1,
    className = '',
    ...props
  },
  ref
) {
  if (count > 1) {
    return (
      <div ref={ref} className="flex flex-col gap-2" {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant={variant}
            width={i === count - 1 ? '75%' : width}
            height={height}
          />
        ))}
      </div>
    );
  }

  const base =
    'bg-surface-hover animate-shimmer shrink-0';

  switch (variant) {
    case 'avatar': {
      const dim = typeof size === 'number' ? `${size}px` : size;
      return (
        <div
          ref={ref}
          className={`${base} rounded-full ${className}`}
          style={{ width: dim, height: dim, ...shimmerStyle }}
          {...props}
        />
      );
    }

    case 'title':
      return (
        <div
          ref={ref}
          className={`${base} rounded-lg ${className}`}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: height ?? 24,
            ...shimmerStyle,
          }}
          {...props}
        />
      );

    case 'card':
      return (
        <div
          ref={ref}
          className={`${base} rounded-xl ${className}`}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: height ?? 120,
            ...shimmerStyle,
          }}
          {...props}
        />
      );

    case 'image':
      return (
        <div
          ref={ref}
          className={`${base} rounded-xl w-full aspect-video ${className}`}
          style={shimmerStyle}
          {...props}
        />
      );

    // 'text' (default)
    default:
      return (
        <div
          ref={ref}
          className={`${base} rounded-md ${className}`}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: height ?? 14,
            ...shimmerStyle,
          }}
          {...props}
        />
      );
  }
});

export default Skeleton;

// ─── Composites ───────────────────────────────────────────────────────────────

/**
 * PostCardSkeleton — mimics a PostCard:
 *   avatar + author name/meta row → 3 text lines → image → action bar
 */
export function PostCardSkeleton() {
  return (
    <div className="glass p-4 rounded-xl mb-3">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="avatar" size={40} />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton variant="text" width="40%" height={13} />
          <Skeleton variant="text" width="28%" height={11} />
        </div>
      </div>

      {/* Content lines */}
      <div className="flex flex-col gap-2 mb-4">
        <Skeleton variant="text" width="100%" height={13} />
        <Skeleton variant="text" width="92%" height={13} />
        <Skeleton variant="text" width="68%" height={13} />
      </div>

      {/* Image */}
      <Skeleton variant="image" />

      {/* Action bar */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-divider">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="card" width="33%" height={34} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * PanelSkeleton — mimics a side-panel: header bar + 5 list rows
 */
export function PanelSkeleton() {
  return (
    <div className="glass rounded-xl p-4">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-5">
        <Skeleton variant="title" width="45%" height={20} />
        <Skeleton variant="card" width={60} height={26} className="rounded-lg" />
      </div>

      {/* 5 list items */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="avatar" size={36} />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton variant="text" width={`${60 + (i % 3) * 12}%`} height={12} />
              <Skeleton variant="text" width={`${35 + (i % 4) * 8}%`} height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ProfileSkeleton — avatar (centred) + name + stats row + bio lines
 */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4">
      {/* Avatar */}
      <Skeleton variant="avatar" size={80} />

      {/* Name */}
      <div className="flex flex-col items-center gap-2 w-full">
        <Skeleton variant="title" width="50%" height={22} />
        <Skeleton variant="text" width="35%" height={13} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-8 w-full mt-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton variant="title" width={36} height={20} />
            <Skeleton variant="text" width={44} height={11} />
          </div>
        ))}
      </div>

      {/* Bio lines */}
      <div className="w-full flex flex-col gap-2 mt-1">
        <Skeleton variant="text" width="90%" height={13} />
        <Skeleton variant="text" width="78%" height={13} />
        <Skeleton variant="text" width="55%" height={13} />
      </div>
    </div>
  );
}

/**
 * MessageSkeleton — alternating left/right chat bubbles (5 pairs)
 */
export function MessageSkeleton() {
  // Each entry: { side: 'left'|'right', lineW: width of text bar }
  const bubbles = [
    { side: 'left',  lineW: '55%' },
    { side: 'right', lineW: '40%' },
    { side: 'left',  lineW: '70%' },
    { side: 'right', lineW: '30%' },
    { side: 'left',  lineW: '50%' },
    { side: 'right', lineW: '65%' },
    { side: 'left',  lineW: '42%' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`flex items-end gap-2 ${b.side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {b.side === 'left' && <Skeleton variant="avatar" size={28} />}
          <div
            className={`flex flex-col gap-1.5 max-w-[65%] ${
              b.side === 'right' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Bubble body */}
            <div
              className="bg-surface-hover animate-shimmer rounded-2xl px-4 py-3"
              style={{
                width: b.lineW,
                minWidth: 80,
                height: 38,
                ...shimmerStyle,
              }}
            />
            {/* Timestamp */}
            <Skeleton variant="text" width={40} height={9} />
          </div>
        </div>
      ))}
    </div>
  );
}
