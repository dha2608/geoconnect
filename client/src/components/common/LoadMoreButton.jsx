import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * LoadMoreButton — pagination trigger using design tokens.
 */
const LoadMoreButton = memo(function LoadMoreButton({ onClick, loading, hasMore }) {
  if (!hasMore) return null;

  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { scale: 1.02 } : {}}
      whileTap={!loading ? { scale: 0.97 } : {}}
      className="w-full py-3 px-4 text-sm font-body font-medium rounded-xl transition-all duration-150
        text-txt-secondary hover:text-txt-primary
        bg-surface-hover/60 hover:bg-surface-active
        border border-surface-divider hover:border-accent-primary/20
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <motion.span
            className="inline-block w-4 h-4 rounded-full border-2 border-surface-divider border-t-accent-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          Loading...
        </span>
      ) : (
        'Load More'
      )}
    </motion.button>
  );
});

export default LoadMoreButton;
