import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ImageLightbox — fullscreen image viewer with gallery navigation.
 *
 * Usage:
 *   <ImageLightbox images={urls} initialIndex={0} isOpen onClose={fn} />
 *
 * Features:
 *   - Smooth spring animations (open/close/slide)
 *   - Left/right arrow navigation + keyboard (ArrowLeft, ArrowRight, Escape)
 *   - Dot indicators for multi-image galleries
 *   - Click backdrop to close
 *   - Zoom-in effect on open
 */

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const imageVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.9 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.9 }),
};

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ImageLightbox({ images = [], initialIndex = 0, isOpen, onClose }) {
  const [[index, direction], setPage] = useState([initialIndex, 0]);

  // Reset index when opening with a new initialIndex
  useEffect(() => {
    if (isOpen) setPage([initialIndex, 0]);
  }, [isOpen, initialIndex]);

  const paginate = useCallback((newDir) => {
    setPage(([prev]) => {
      const next = prev + newDir;
      if (next < 0 || next >= images.length) return [prev, 0];
      return [next, newDir];
    });
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') paginate(-1);
      if (e.key === 'ArrowRight') paginate(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, paginate]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!images.length) return null;

  const hasMultiple = images.length > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                       flex items-center justify-center text-white transition-colors"
            aria-label="Close lightbox"
          >
            <XIcon />
          </button>

          {/* Counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-body font-medium">
              {index + 1} / {images.length}
            </div>
          )}

          {/* Image */}
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.img
              key={`lightbox-${index}`}
              src={images[index]}
              alt={`Image ${index + 1}`}
              custom={direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-[1] max-w-[90vw] max-h-[85vh] object-contain rounded-lg select-none"
              draggable={false}
              onClick={(e) => e.stopPropagation()}
            />
          </AnimatePresence>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={() => paginate(-1)}
                disabled={index === 0}
                className="absolute left-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20
                           flex items-center justify-center text-white transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous image"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => paginate(1)}
                disabled={index === images.length - 1}
                className="absolute right-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20
                           flex items-center justify-center text-white transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next image"
              >
                <ChevronRight />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {hasMultiple && images.length <= 10 && (
            <div className="absolute bottom-6 z-10 flex items-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage([i, i > index ? 1 : -1])}
                  className={`rounded-full transition-all duration-200 ${
                    i === index
                      ? 'w-2.5 h-2.5 bg-white'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/60'
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
}
