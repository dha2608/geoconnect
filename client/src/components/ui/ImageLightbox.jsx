import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ImageLightbox — fullscreen image viewer with gallery navigation.
 *
 * Usage:
 *   <ImageLightbox images={urls} initialIndex={0} isOpen onClose={fn} />
 *
 * Features:
 *   - Smooth spring animations (open/close/slide)
 *   - Keyboard navigation (ArrowLeft, ArrowRight, Escape, +/-, 0)
 *   - Dot indicators for multi-image galleries (≤ 10 images)
 *   - Image counter ("1 / 5") in top-left
 *   - Swipe left/right to navigate (touch)
 *   - Swipe down to close (touch)
 *   - Pinch-to-zoom (1x – 4x)
 *   - Double-tap to toggle 1x ↔ 2x zoom
 *   - Pan when zoomed
 *   - Zoom +/- buttons and reset in toolbar
 *   - Backdrop click to close (or reset zoom if zoomed)
 *   - Body scroll lock while open
 */

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="2" x2="8" y2="14" />
    <line x1="2" y1="8" x2="14" y2="8" />
  </svg>
);

const MinusIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="2" y1="8" x2="14" y2="8" />
  </svg>
);

// ─── helpers ────────────────────────────────────────────────────────────────

function getSrc(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url ?? image.src ?? '';
}

function pinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// ─── component ──────────────────────────────────────────────────────────────

const ImageLightbox = memo(function ImageLightbox({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
}) {
  const [currentIndex, setCurrentIndex]   = useState(initialIndex);
  const [zoom, setZoom]                   = useState(1);
  const [pan, setPan]                     = useState({ x: 0, y: 0 });

  // refs for touch handling
  const lastTapRef          = useRef(0);
  const touchStartRef       = useRef(null);
  const initialPinchDistRef = useRef(null);
  const initialZoomRef      = useRef(1);

  // ── zoom helpers ────────────────────────────────────────────────────────

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const clampZoom = (z) => Math.min(Math.max(z, 1), 4);

  // ── navigation ──────────────────────────────────────────────────────────

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < images.length) {
      setCurrentIndex(idx);
      resetZoom();
    }
  }, [images.length, resetZoom]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // ── sync initialIndex when lightbox opens ───────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [isOpen, initialIndex, resetZoom]);

  // ── keyboard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape')              onClose();
      else if (e.key === 'ArrowRight')     goNext();
      else if (e.key === 'ArrowLeft')      goPrev();
      else if (e.key === '+' || e.key === '=') setZoom(z => clampZoom(z + 0.5));
      else if (e.key === '-')              setZoom(z => clampZoom(z - 0.5));
      else if (e.key === '0')              resetZoom();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, goNext, goPrev, resetZoom]);

  // ── body scroll lock ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ── reset pan when fully zoomed out ─────────────────────────────────────

  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // ── double-tap ──────────────────────────────────────────────────────────

  const handleDoubleTap = useCallback(() => {
    if (zoom > 1) resetZoom();
    else setZoom(2);
  }, [zoom, resetZoom]);

  // ── touch handlers ──────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      initialPinchDistRef.current = pinchDistance(e.touches);
      initialZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  }, [zoom, handleDoubleTap]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      // Pinch-to-zoom
      const dist  = pinchDistance(e.touches);
      const scale = dist / initialPinchDistRef.current;
      setZoom(clampZoom(initialZoomRef.current * scale));
      e.preventDefault();
    } else if (e.touches.length === 1 && zoom > 1 && touchStartRef.current) {
      // Pan when zoomed
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: touchStartRef.current.time,
      };
    }
  }, [zoom]);

  const handleTouchEnd = useCallback((e) => {
    initialPinchDistRef.current = null;

    if (e.touches.length === 0 && touchStartRef.current) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      if (zoom <= 1) {
        // Horizontal swipe → navigate
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dt < 500) {
          if (dx < 0) goNext();
          else         goPrev();
        }
        // Swipe down → close
        else if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
          onClose();
        }
      }
    }

    touchStartRef.current = null;
  }, [zoom, goNext, goPrev, onClose]);

  // ── render ───────────────────────────────────────────────────────────────

  if (!images.length) return null;

  const src        = getSrc(images[currentIndex]);
  const hasMultiple = images.length > 1;
  const isZoomed   = zoom > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={isZoomed ? resetZoom : onClose}
          />

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 sm:p-4">

            {/* Image counter */}
            <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full select-none">
              {currentIndex + 1} / {images.length}
            </span>

            {/* Zoom controls + close */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isZoomed && (
                <span className="text-white/70 text-xs bg-black/40 px-2.5 py-1 rounded-full select-none">
                  {zoom.toFixed(1)}x
                </span>
              )}

              <button
                onClick={() => setZoom(z => clampZoom(z + 0.5))}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                aria-label="Zoom in"
              >
                <PlusIcon />
              </button>

              <button
                onClick={() => setZoom(z => clampZoom(z - 0.5))}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                aria-label="Zoom out"
              >
                <MinusIcon />
              </button>

              {isZoomed && (
                <button
                  onClick={resetZoom}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-xs font-semibold transition-colors"
                  aria-label="Reset zoom"
                >
                  1:1
                </button>
              )}

              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                aria-label="Close lightbox"
              >
                <XIcon />
              </button>
            </div>
          </div>

          {/* ── Image wrapper (touch target) ─────────────────────────────── */}
          <div
            className="relative z-[1] select-none touch-none"
            style={{ cursor: isZoomed ? 'grab' : 'default' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={`lightbox-${currentIndex}`}
                src={src}
                alt={`Image ${currentIndex + 1} of ${images.length}`}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: 'transform 0.15s ease-out',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
              />
            </AnimatePresence>
          </div>

          {/* ── Navigation arrows (hidden when zoomed) ───────────────────── */}
          {hasMultiple && !isZoomed && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={goPrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10
                             w-11 h-11 flex items-center justify-center
                             rounded-full bg-black/40 hover:bg-black/65 text-white
                             transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10
                             w-11 h-11 flex items-center justify-center
                             rounded-full bg-black/40 hover:bg-black/65 text-white
                             transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight />
                </button>
              )}
            </>
          )}

          {/* ── Dot indicators ────────────────────────────────────────────── */}
          {hasMultiple && images.length <= 10 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentIndex
                      ? 'w-2.5 h-2.5 bg-white scale-110'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/65'
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ImageLightbox;
