/**
 * Reusable Framer Motion animation variants.
 *
 * Centralises every repeated motion pattern so components import
 * rather than redefine.  Matches the animation spec in doc.mdc.
 *
 * Usage:
 *   import { fadeUp, staggerContainer, staggerItem, PANEL_SPRING } from '../../utils/animations';
 *   <motion.div variants={staggerContainer} initial="hidden" animate="visible">
 *     <motion.div variants={staggerItem}>…</motion.div>
 *   </motion.div>
 */

// ─── Spring presets ──────────────────────────────────────────────────────────

/** Standard panel slide spring (sidebar, detail panels, notification panel). */
export const PANEL_SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 };

/** Modal spring — slightly softer landing. */
export const MODAL_SPRING = { type: 'spring', damping: 25, stiffness: 300 };

/** Feed / list spring — gentler for scroll-heavy UIs. */
export const LIST_SPRING = { type: 'spring', damping: 26, stiffness: 210 };

/** Bottom sheet spring — snappy. */
export const SHEET_SPRING = { type: 'spring', stiffness: 350, damping: 35 };

/** Marker pop spring — extra bouncy. */
export const MARKER_SPRING = { type: 'spring', stiffness: 420, damping: 22 };

// ─── Shared ease curve ───────────────────────────────────────────────────────

/** Custom smooth ease — used across most duration-based transitions. */
export const SMOOTH_EASE = [0.16, 1, 0.3, 1];

// ─── Element variants ────────────────────────────────────────────────────────

/** Fade up with subtle blur. Great default for cards, sections, page heroes. */
export const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: SMOOTH_EASE },
  },
};

/** Slide in from left edge. Sidebars, drawers. */
export const slideInLeft = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: SMOOTH_EASE },
  },
  exit: { x: '-100%', opacity: 0, transition: { duration: 0.3 } },
};

/** Slide in from right edge. Detail panels. */
export const slideInRight = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: SMOOTH_EASE },
  },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.3 } },
};

/** Bottom sheet slide. */
export const bottomSheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: SHEET_SPRING },
  exit: { y: '100%', transition: { duration: 0.3 } },
};

/** Scale-in — modals, popovers. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: MODAL_SPRING,
  },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
};

/** Dropdown menu. */
export const dropdown = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: SMOOTH_EASE },
  },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } },
};

/** Page-level transition — full-page fade with blur. */
export const pageTransition = {
  hidden: { opacity: 0, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
  exit: { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.3 } },
};

/** Marker appearing on map. */
export const markerAppear = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: MARKER_SPRING,
  },
};

/** Overlay / backdrop fade. */
export const overlayFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

// ─── Container / stagger variants ────────────────────────────────────────────

/** Parent container that staggers children. */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

/** Child item for use inside staggerContainer. */
export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: SMOOTH_EASE },
  },
};

// ─── Interaction variants (whileHover / whileTap) ────────────────────────────

/** Standard button interaction — subtle scale. */
export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.04 },
  tap: { scale: 0.96 },
};

/** Card hover — lift effect. */
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -3 },
  tap: { scale: 0.97 },
};

// ─── Page variants (common pattern across pages) ─────────────────────────────

/** Page wrapper — staggers sections. */
export const pageVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};

/** Section within a page. */
export const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SMOOTH_EASE },
  },
};

/** Grid that staggers card children. */
export const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Individual card inside a grid. */
export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: SMOOTH_EASE },
  },
};
