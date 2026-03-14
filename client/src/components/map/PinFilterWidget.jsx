import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { setFilters } from '../../features/pins/pinSlice';

// ---------------------------------------------------------------------------
// Category config — mirrors CATEGORY_MAP in PinDetailPanel
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'food',          label: 'Food & Drink',   emoji: '🍜' },
  { id: 'entertainment', label: 'Entertainment',  emoji: '🎭' },
  { id: 'shopping',      label: 'Shopping',       emoji: '🛍️' },
  { id: 'outdoors',      label: 'Outdoors',       emoji: '🌿' },
  { id: 'culture',       label: 'Culture & Arts', emoji: '🎨' },
  { id: 'travel',        label: 'Travel',         emoji: '✈️' },
  { id: 'sports',        label: 'Sports',         emoji: '⚽' },
  { id: 'health',        label: 'Health',         emoji: '💊' },
  { id: 'education',     label: 'Education',      emoji: '📚' },
  { id: 'other',         label: 'Other',          emoji: '📍' },
];

// ---------------------------------------------------------------------------
// Framer-motion variants
// ---------------------------------------------------------------------------
const panelVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: -6,
    transformOrigin: 'top left',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -6,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 520, damping: 22 },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

const checkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.12 } },
  exit:   { scale: 0, opacity: 0, transition: { duration: 0.1 } },
};

// ---------------------------------------------------------------------------
// FilterIcon — funnel SVG
// ---------------------------------------------------------------------------
function FilterIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PinFilterWidget
// ---------------------------------------------------------------------------
export default function PinFilterWidget() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  // ── Redux state ───────────────────────────────────────────────────────────
  const pins          = useSelector((state) => state.pins.pins);
  const currentFilter = useSelector((state) => state.pins.filters.category);

  // Normalise: 'all' → empty array, anything else kept as array
  const activeCategories = useMemo(() => {
    if (!currentFilter || currentFilter === 'all') return [];
    return Array.isArray(currentFilter) ? currentFilter : [currentFilter];
  }, [currentFilter]);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeCount = activeCategories.length;
  const hasFilter   = activeCount > 0;

  const visibleCount = useMemo(() => {
    if (!hasFilter) return pins.length;
    return pins.filter((p) => activeCategories.includes(p.category)).length;
  }, [pins, activeCategories, hasFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleCategory = (id) => {
    const next = activeCategories.includes(id)
      ? activeCategories.filter((c) => c !== id)
      : [...activeCategories, id];

    dispatch(setFilters({ category: next.length === 0 ? 'all' : next }));
  };

  const clearAll = () => {
    dispatch(setFilters({ category: 'all' }));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="absolute left-4 top-[140px] pointer-events-auto z-[1001]">

      {/* ── Toggle button ────────────────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close filter panel' : 'Open filter panel'}
          aria-expanded={open}
          className={[
            'w-10 h-10 rounded-full glass flex items-center justify-center',
            'border transition-colors duration-150 cursor-pointer select-none',
            open || hasFilter
              ? 'text-accent-primary bg-accent-primary/10 border-accent-primary/30'
              : 'text-txt-secondary border-surface-divider hover:text-txt-primary hover:bg-surface-hover',
          ].join(' ')}
        >
          <FilterIcon />
        </button>

        {/* Badge — pulses when filters are active */}
        <AnimatePresence>
          {hasFilter && (
            <motion.span
              key="filter-badge"
              variants={badgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={[
                'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1',
                'rounded-full bg-accent-primary text-white',
                'text-[10px] font-bold leading-none',
                'flex items-center justify-center',
                'animate-pulse',
              ].join(' ')}
              aria-label={`${activeCount} active filter${activeCount !== 1 ? 's' : ''}`}
            >
              {activeCount}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="filter-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              'absolute left-0 top-12 w-56',
              'glass rounded-2xl border border-surface-divider',
              'shadow-2xl overflow-hidden',
            ].join(' ')}
            role="dialog"
            aria-modal="false"
            aria-label="Filter pins by category"
          >

            {/* Header */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-surface-divider">
              <span className="text-[11px] font-semibold text-txt-muted tracking-widest uppercase">
                Categories
              </span>
              <AnimatePresence>
                {hasFilter && (
                  <motion.button
                    key="clear-btn"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.15 }}
                    onClick={clearAll}
                    className="text-[11px] font-medium text-accent-primary hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    Clear all
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Category list */}
            <div
              className="py-1 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              role="group"
              aria-label="Category options"
            >
              {CATEGORIES.map((cat) => {
                const isChecked = activeCategories.includes(cat.id);

                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={isChecked}
                    aria-label={`${isChecked ? 'Remove' : 'Add'} ${cat.label} filter`}
                    className={[
                      'w-full flex items-center gap-2.5 px-3.5 py-2 text-left',
                      'transition-colors duration-100 cursor-pointer select-none',
                      isChecked
                        ? 'bg-accent-primary/10 text-txt-primary'
                        : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary',
                    ].join(' ')}
                  >
                    {/* Checkbox */}
                    <span
                      className={[
                        'flex-shrink-0 w-[15px] h-[15px] rounded border',
                        'flex items-center justify-center transition-colors duration-150',
                        isChecked
                          ? 'bg-accent-primary border-accent-primary'
                          : 'border-surface-divider bg-transparent',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      <AnimatePresence>
                        {isChecked && (
                          <motion.svg
                            key="check"
                            variants={checkVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            width="9"
                            height="7"
                            viewBox="0 0 9 7"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="1 3.5 3.5 6 8 1" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </span>

                    {/* Emoji */}
                    <span className="text-[15px] leading-none flex-shrink-0" aria-hidden="true">
                      {cat.emoji}
                    </span>

                    {/* Label */}
                    <span className="text-xs font-body flex-1 leading-tight">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer — results summary */}
            <div className="px-3.5 py-2.5 border-t border-surface-divider bg-elevated/30">
              <p className="text-[11px] text-txt-muted leading-snug">
                Showing{' '}
                <span className="text-txt-primary font-semibold">{visibleCount}</span>
                {' '}of{' '}
                <span className="text-txt-primary font-semibold">{pins.length}</span>
                {' '}pins
                {hasFilter && (
                  <>
                    {' '}in{' '}
                    <span className="text-accent-primary font-medium">
                      {activeCount} {activeCount === 1 ? 'category' : 'categories'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
