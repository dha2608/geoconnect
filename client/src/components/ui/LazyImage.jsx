import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageLightbox from './ImageLightbox';

// ── Inline SVG Icons ───────────────────────────────────────────────────────────

/** Broken-image icon for error state */
const BrokenImageIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Frame */}
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    {/* Mountain/image icon inside */}
    <path d="M3 16.5 9 11l4 4 2.5-2.5L21 17" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    {/* Diagonal slash */}
    <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5" />
  </svg>
);

/** Expand / fullscreen icon shown on gallery-item hover */
const ExpandIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

// ── Shimmer sweep style ────────────────────────────────────────────────────────
// Uses the `shimmer` keyframe already defined in tailwind.config.js
const shimmerSweep = {
  background:
    'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.06) 50%, transparent 80%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 2s linear infinite',
};

// ── LazyImage ──────────────────────────────────────────────────────────────────

/**
 * LazyImage — viewport-triggered image loader with blur-up placeholder and
 * smooth fade-in.
 *
 * @param {string}       src         - Image URL (loaded only when in viewport)
 * @param {string}       alt         - Accessible alt text
 * @param {string}       className   - Extra classes on the wrapper
 * @param {string}       aspectRatio - CSS aspect-ratio value, e.g. "16/9", "1/1"
 * @param {ReactNode}    fallback    - Custom error UI (defaults to broken-image icon)
 * @param {string}       blurHash    - data: URI used as CSS bg during loading
 *
 * @example
 * <LazyImage src="https://…/photo.jpg" alt="Post" aspectRatio="16/9" />
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  aspectRatio,
  fallback,
  blurHash,
}) {
  const containerRef = useRef(null);

  const [isInView,  setIsInView]  = useState(false);
  const [isLoaded,  setIsLoaded]  = useState(false);
  const [hasError,  setHasError]  = useState(false);

  // ── Reset when src changes ─────────────────────────────────────────────────
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // ── IntersectionObserver — one-shot trigger, 200px ahead of viewport ───────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Already in view from a previous render (e.g. after src change)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // no need to keep watching
        }
      },
      { rootMargin: '200px', threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad  = useCallback(() => setIsLoaded(true), []);
  const handleError = useCallback(() => setHasError(true), []);

  // ── blurHash support ───────────────────────────────────────────────────────
  // Accepts a data: URI (base64-encoded tiny placeholder image).
  // Full blurhash decoding would need the `blurhash` package; skip for now.
  const blurBgStyle =
    blurHash && blurHash.startsWith('data:')
      ? {
          backgroundImage: `url(${blurHash})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {};

  // ── Container style ────────────────────────────────────────────────────────
  // When aspectRatio is provided the container self-sizes; shimmer + img use
  // absolute positioning.  Without it we add min-h-[200px] so the shimmer has
  // something to fill before the image arrives.
  const containerStyle = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...blurBgStyle,
  };

  const imgPositioning = aspectRatio
    ? 'absolute inset-0 w-full h-full object-cover'
    : 'w-full h-auto object-cover';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${!aspectRatio ? 'min-h-[200px]' : ''} ${className}`}
      style={containerStyle}
    >
      {/* ── Shimmer / blur-up placeholder ─────────────────────────────────── */}
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            key="shimmer"
            className="absolute inset-0 bg-surface-hover"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {/* Sweeping shimmer highlight */}
            <div className="absolute inset-0" style={shimmerSweep} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actual image (only mounted once in viewport) ───────────────────── */}
      {isInView && !hasError && (
        <motion.img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          // Start invisible; animate to opaque once browser signals load
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={imgPositioning}
          draggable={false}
          decoding="async"
        />
      )}

      {/* ── Error fallback ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            key="error"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-surface-hover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="img"
            aria-label={`Failed to load: ${alt}`}
          >
            {fallback ?? (
              <>
                <BrokenImageIcon className="w-9 h-9 text-txt-muted" />
                <span className="text-txt-muted text-xs font-body select-none">
                  Failed to load
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ImageGallery ───────────────────────────────────────────────────────────────

/**
 * ImageGallery — responsive masonry-style grid of LazyImages.
 * Click any image to expand it (built-in lightbox, or call `onExpand`).
 *
 * @param {Array<string|{src,alt?,blurHash?}>} images
 *   Array of image URLs or objects with { src, alt?, blurHash? }.
 * @param {number}   columns     - Desktop column count (1–4, default: 2)
 * @param {function} onExpand    - Called with (index, imageItem) on click.
 *                                 If omitted, a built-in lightbox opens.
 * @param {string}   className   - Extra classes on the grid wrapper
 * @param {string}   aspectRatio - Shared aspect-ratio for every cell (default "1/1")
 *
 * @example
 * <ImageGallery images={post.images} columns={3} aspectRatio="4/3" />
 * <ImageGallery images={urls} onExpand={(i, img) => openMyLightbox(i)} />
 */
export function ImageGallery({
  images = [],
  columns = 2,
  onExpand,
  className = '',
  aspectRatio = '1/1',
}) {
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images.length) return null;

  // Flatten images to plain URL strings for the built-in lightbox
  const imgSrcs = images.map((img) =>
    typeof img === 'string' ? img : img.src,
  );

  const handleClick = (index) => {
    if (onExpand) {
      onExpand(index, images[index]);
    } else {
      // Dispatch a DOM event too, so external listeners can react
      window.dispatchEvent(
        new CustomEvent('gallery:expand', {
          detail: { index, image: images[index], images },
        }),
      );
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  // Responsive column classes (mobile always 1 col)
  const colClass =
    {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
    }[columns] ?? 'sm:grid-cols-2';

  return (
    <>
      <div className={`grid grid-cols-1 ${colClass} gap-2 ${className}`}>
        {images.map((image, index) => {
          const imgSrc     = typeof image === 'string' ? image       : image.src;
          const imgAlt     = typeof image === 'object' && image.alt  ? image.alt     : `Image ${index + 1}`;
          const imgBlurHash = typeof image === 'object'              ? image.blurHash : undefined;

          return (
            <motion.div
              key={`${imgSrc}-${index}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative group cursor-pointer rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base"
              onClick={() => handleClick(index)}
              role="button"
              tabIndex={0}
              aria-label={`Expand ${imgAlt}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(index);
                }
              }}
            >
              {/* Lazy image cell */}
              <LazyImage
                src={imgSrc}
                alt={imgAlt}
                aspectRatio={aspectRatio}
                blurHash={imgBlurHash}
                className="w-full"
              />

              {/* Hover overlay — expand cue */}
              <div
                className="absolute inset-0 bg-base/0 group-hover:bg-base/30 transition-colors duration-200 flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                <div
                  className={[
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'bg-white/15 backdrop-blur-sm',
                    'opacity-0 group-hover:opacity-100',
                    'scale-75 group-hover:scale-100',
                    'transition-[opacity,transform] duration-200 ease-out',
                  ].join(' ')}
                >
                  <ExpandIcon className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Index badge for multi-image awareness */}
              {images.length > 1 && (
                <div
                  className={[
                    'absolute top-2 left-2 px-2 py-0.5 rounded-full',
                    'bg-base/60 backdrop-blur-sm',
                    'text-txt-secondary text-[10px] font-body font-medium',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {index + 1} / {images.length}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Built-in lightbox (only mounts when no onExpand override) */}
      {!onExpand && (
        <ImageLightbox
          images={imgSrcs}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
