import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️', query: 'restaurant' },
  { id: 'coffee',     label: 'Coffee',      icon: '☕',  query: 'coffee shop' },
  { id: 'gas',        label: 'Gas',         icon: '⛽',  query: 'gas station' },
  { id: 'hotel',      label: 'Hotels',      icon: '🏨',  query: 'hotel' },
  { id: 'atm',        label: 'ATM',         icon: '🏧',  query: 'atm' },
  { id: 'parking',    label: 'Parking',     icon: '🅿️',  query: 'parking' },
  { id: 'pharmacy',   label: 'Pharmacy',    icon: '💊',  query: 'pharmacy' },
  { id: 'grocery',    label: 'Grocery',     icon: '🛒',  query: 'grocery store' },
];

// ---------------------------------------------------------------------------
// Framer-motion variants — staggered spring entrance
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const chipVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 26,
    },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function QuickCategories() {
  const [activeId, setActiveId] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoverTimer, setHoverTimer] = useState(null);

  const handleChipClick = (category) => {
    const nextId = activeId === category.id ? null : category.id;
    setActiveId(nextId);

    // Notify SearchBar (and any other listener) via a window-level custom event.
    // SearchBar listens for this and triggers a geocode search immediately.
    if (nextId !== null) {
      window.dispatchEvent(
        new CustomEvent('geo:category-search', {
          detail: { query: category.query },
        })
      );
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setIsVisible(true);
  }, [hoverTimer]);

  const handleMouseLeave = useCallback(() => {
    const timer = setTimeout(() => setIsVisible(false), 400);
    setHoverTimer(timer);
  }, []);

  return (
    // Sits below the SearchBar (top-4 + ~44px height ≈ top-[72px]).
    // right-16 avoids the MapControls column on the right edge.
    // Hover trigger zone — always interactive, content fades in/out.
    <div
      className="absolute top-[72px] left-4 right-16 pointer-events-auto z-[1001]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible trigger strip — always present for hover detection */}
      <div className="h-3" />
      <AnimatePresence>
      {/*
        Wrapper with overflow-hidden clips the fade-edge overlays cleanly.
        The scrollable row lives inside so the gradient overlays are layered on top.
      */}
      {(isVisible || activeId) && (
      <motion.div
        key="quick-cats"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden"
      >

        {/* ── Left fade — hints that the list scrolls ────────────────── */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to right, var(--glass-bg, rgba(15,21,32,0.72)), transparent)',
          }}
        />

        {/* ── Right fade — stronger, as the default overflow direction ── */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to left, var(--glass-bg, rgba(15,21,32,0.72)), transparent)',
          }}
        />

        {/* ── Scrollable chip row ──────────────────────────────────────── */}
        <motion.div
          className="flex gap-2 overflow-x-auto py-1 px-1 [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: 'none',      // Firefox
            msOverflowStyle: 'none',     // IE/Edge legacy
          }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="toolbar"
          aria-label="Quick category filters"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeId === cat.id;

            return (
              <motion.button
                key={cat.id}
                variants={chipVariants}
                onClick={() => handleChipClick(cat)}
                whileTap={{ scale: 0.92 }}
                aria-pressed={isActive}
                aria-label={`Filter by ${cat.label}`}
                className={[
                  // Base chip shape and typography
                  'glass rounded-full px-3 py-1.5 text-xs font-body cursor-pointer',
                  'whitespace-nowrap flex-shrink-0 flex items-center gap-1.5',
                  'select-none transition-colors duration-150',
                  // Active vs idle appearance
                  isActive
                    ? 'bg-accent-primary/20 text-accent-primary ring-1 ring-accent-primary/30'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover',
                ].join(' ')}
              >
                {/* Emoji icon — decorative, hidden from screen readers */}
                <span className="text-sm leading-none" aria-hidden="true">
                  {cat.icon}
                </span>

                {/* Label */}
                <span>{cat.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
