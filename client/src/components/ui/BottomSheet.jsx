/**
 * BottomSheet.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Mobile-first draggable bottom sheet with snap points.
 *
 * Features:
 *  • Drag handle at top
 *  • Spring animation from bottom
 *  • Snap to 40 % and 85 % of viewport height
 *  • Close on swipe-down past threshold
 *  • Backdrop click / escape to close
 *  • Body scroll lock when open
 */

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

// ─── Snap points (fraction of viewport height from BOTTOM) ──────────────────

const SNAP_HALF  = 0.40;   // 40 % of vh
const SNAP_FULL  = 0.85;   // 85 % of vh
const CLOSE_THRESHOLD = 0.18; // swipe below 18 % → close

export default function BottomSheet({ isOpen, onClose, children, initialSnap = 'half', title }) {
  const sheetRef  = useRef(null);
  const dragY     = useMotionValue(0);
  const vh        = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Heights in px for each snap
  const halfH  = vh * SNAP_HALF;
  const fullH  = vh * SNAP_FULL;
  const closeH = vh * CLOSE_THRESHOLD;

  // Current target height (negative y from bottom of screen)
  const initialH = initialSnap === 'full' ? fullH : halfH;

  // Backdrop opacity tied to sheet position
  const backdropOpacity = useTransform(dragY, [0, -halfH, -fullH], [0, 0.35, 0.5]);

  // ── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // ── Keyboard escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── Snap logic on drag end ───────────────────────────────────────────────
  const handleDragEnd = useCallback((_e, info) => {
    const currentY   = dragY.get();      // negative = sheet visible height
    const velocity    = info.velocity.y;  // positive = dragging down
    const absHeight   = Math.abs(currentY);

    // Fast swipe down → close
    if (velocity > 500) {
      onClose();
      return;
    }
    // Fast swipe up → full
    if (velocity < -500) {
      animate(dragY, -fullH, { type: 'spring', stiffness: 350, damping: 35 });
      return;
    }

    // Decide snap by position
    if (absHeight < closeH) {
      // Below close threshold → close
      onClose();
    } else if (absHeight < (halfH + fullH) / 2) {
      // Closer to half → snap half
      animate(dragY, -halfH, { type: 'spring', stiffness: 350, damping: 35 });
    } else {
      // Closer to full → snap full
      animate(dragY, -fullH, { type: 'spring', stiffness: 350, damping: 35 });
    }
  }, [dragY, halfH, fullH, closeH, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ──────────────────────────────────────────────── */}
          <motion.div
            key="bs-backdrop"
            className="fixed inset-0 z-50 bg-black"
            style={{ opacity: backdropOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Sheet ─────────────────────────────────────────────────── */}
          <motion.div
            ref={sheetRef}
            key="bs-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet'}
            className="fixed left-0 right-0 z-50 flex flex-col
                       glass rounded-t-3xl border-t border-x border-surface-divider"
            style={{
              bottom: 0,
              y: dragY,
              height: fullH + 40, // extra room so content doesn't cut off
              maxHeight: `${SNAP_FULL * 100}vh`,
              touchAction: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.45)',
            }}
            initial={{ y: vh }}
            animate={{ y: -initialH }}
            exit={{ y: vh }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            drag="y"
            dragConstraints={{ top: -fullH, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            {/* ── Drag handle ─────────────────────────────────────────── */}
            <div className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-surface-divider" />
            </div>

            {/* ── Title ───────────────────────────────────────────────── */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-surface-divider flex-shrink-0">
                <h2 className="text-base font-heading font-bold text-txt-primary">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center
                             text-txt-muted hover:text-txt-primary transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* ── Content ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
