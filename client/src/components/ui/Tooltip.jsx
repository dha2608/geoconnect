import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Position offset helpers ──────────────────────────────────────────────────
const POSITION_CONFIG = {
  top: {
    tooltip:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:      'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-surface-divider',
    arrowClass: 'border-t-[6px] border-l-[5px] border-r-[5px]',
    animate:    { y: -4 },
    initial:    { y: 0 },
  },
  bottom: {
    tooltip:    'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow:      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-surface-divider',
    arrowClass: 'border-b-[6px] border-l-[5px] border-r-[5px]',
    animate:    { y: 4 },
    initial:    { y: 0 },
  },
  left: {
    tooltip:    'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:      'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-surface-divider',
    arrowClass: 'border-l-[6px] border-t-[5px] border-b-[5px]',
    animate:    { x: -4 },
    initial:    { x: 0 },
  },
  right: {
    tooltip:    'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-surface-divider',
    arrowClass: 'border-r-[6px] border-t-[5px] border-b-[5px]',
    animate:    { x: 4 },
    initial:    { x: 0 },
  },
};

// ─── Tooltip animation variants ───────────────────────────────────────────────
const tooltipVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  visible: (pos) => ({
    opacity: 1,
    scale: 1,
    ...POSITION_CONFIG[pos]?.animate,
    transition: { type: 'spring', damping: 20, stiffness: 300, duration: 0.2 },
  }),
};

// ─── Tooltip component ────────────────────────────────────────────────────────
export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  className = '',
}) {
  const [visible, setVisible]   = useState(false);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  const config = POSITION_CONFIG[position] ?? POSITION_CONFIG.top;

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => setVisible(true), delay);
  }, [delay, clearTimers]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setVisible(false), 80);
  }, [clearTimers]);

  // Keyboard: hide on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') setVisible(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  // Cleanup timers on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  // Don't bother rendering if no content provided
  if (!content) return <>{children}</>;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            role="tooltip"
            className={`absolute z-[300] pointer-events-none ${config.tooltip}`}
            variants={tooltipVariants}
            custom={position}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Glass pill */}
            <div className="glass rounded-lg border border-surface-divider px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              {typeof content === 'string' ? (
                <span className="text-xs font-medium text-txt-primary">{content}</span>
              ) : (
                content
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
