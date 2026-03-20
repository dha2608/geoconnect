import { motion } from 'framer-motion';

// ─── Icon Definitions ─────────────────────────────────────────────────────────
// All icons are inline SVG at 64×64 viewBox, stroke-based.

const icons = {
  posts: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* newspaper / document */}
      <rect x="10" y="8" width="44" height="48" rx="5" />
      <line x1="20" y1="22" x2="44" y2="22" />
      <line x1="20" y1="31" x2="44" y2="31" />
      <line x1="20" y1="40" x2="34" y2="40" />
      <rect x="20" y="14" width="24" height="4" rx="1" />
    </svg>
  ),

  messages: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* two overlapping chat bubbles */}
      <path d="M10 14 Q10 8 16 8 H42 Q48 8 48 14 V30 Q48 36 42 36 H34 L24 46 V36 H16 Q10 36 10 30 Z" />
      <path d="M48 24 Q54 24 54 30 V44 Q54 50 48 50 H40 L32 58 V50 H26" strokeDasharray="3 3" strokeOpacity="0.45" />
    </svg>
  ),

  notifications: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* bell */}
      <path d="M32 8 C22 8 16 16 16 24 L16 40 L10 46 H54 L48 40 V24 C48 16 42 8 32 8 Z" />
      <line x1="32" y1="8" x2="32" y2="4" />
      <path d="M26 46 Q26 52 32 52 Q38 52 38 46" />
    </svg>
  ),

  events: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* calendar */}
      <rect x="10" y="14" width="44" height="40" rx="5" />
      <line x1="10" y1="26" x2="54" y2="26" />
      <line x1="22" y1="8" x2="22" y2="20" />
      <line x1="42" y1="8" x2="42" y2="20" />
      <circle cx="24" cy="36" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="36" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="36" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="24" cy="46" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="46" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  ),

  pins: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* map pin */}
      <path d="M32 6 C20 6 12 16 12 26 C12 40 32 58 32 58 C32 58 52 40 52 26 C52 16 44 6 32 6 Z" />
      <circle cx="32" cy="26" r="7" />
    </svg>
  ),

  search: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* magnifying glass */}
      <circle cx="27" cy="27" r="17" />
      <line x1="40" y1="40" x2="56" y2="56" />
    </svg>
  ),

  users: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* two people */}
      <circle cx="22" cy="22" r="8" />
      <path d="M6 56 C6 44 14 38 22 38 C30 38 38 44 38 56" />
      <circle cx="44" cy="20" r="7" strokeOpacity="0.55" />
      <path d="M38 56 C38 45 44 40 52 40 C58 40 62 44 62 50" strokeOpacity="0.55" />
    </svg>
  ),

  error: (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* warning triangle */}
      <path d="M32 8 L58 54 H6 Z" />
      <line x1="32" y1="26" x2="32" y2="40" />
      <circle cx="32" cy="47" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
};

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } },
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

/**
 * EmptyState — centred empty-content placeholder.
 *
 * @param {string}  icon         One of: posts | messages | notifications | events | pins | search | users | error
 * @param {string}  title        Heading text
 * @param {string}  description  Supporting text (optional)
 * @param {{ label: string, onClick: function }} action  CTA button (optional)
 * @param {string}  className    Extra wrapper classes
 */
export default function EmptyState({ icon, title, description, action, className = '' }) {
  const IconNode = typeof icon === 'string' ? (icons[icon] ?? null) : (icon ?? null);

  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Icon */}
      {IconNode && (
        <motion.div
          variants={itemVariants}
          className="w-16 h-16 text-txt-secondary"
          aria-hidden="true"
        >
          {IconNode}
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        variants={itemVariants}
        className="text-lg font-heading text-txt-primary mt-4 leading-snug"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          variants={itemVariants}
          className="text-sm font-body text-txt-muted mt-1 max-w-xs text-center leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Action button */}
      {action && (
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={action.onClick}
          className="mt-6 glass rounded-xl px-5 py-2.5 text-sm font-body font-medium text-accent-primary
            border border-accent-primary/20 hover:border-accent-primary/40
            hover:bg-accent-primary/8 transition-colors duration-150 cursor-pointer"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
