import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toggleSidebar, setActivePanel } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';
import LiveIndicator from '../ui/LiveIndicator';

// ── Animation variants ──────────────────────────────────────────────────────

const badgeAnim = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 520, damping: 22, mass: 0.6 },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.12 } },
};

// ── Inline SVG icons (no external lib) ─────────────────────────────────────

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SearchIcon({ size = 18 }) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * Compass brand icon — gradient needle with directional tick marks.
 * North needle fills with the accent gradient; south needle is muted.
 * Uses a unique gradient ID (gcb-hdr) to avoid SVG id clashes.
 */
function CompassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9" stroke="url(#gcb-hdr)" strokeWidth="1.5" />
      {/* Cardinal tick marks */}
      <line x1="12" y1="4"  x2="12" y2="6.2"  stroke="url(#gcb-hdr)" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
      <line x1="12" y1="17.8" x2="12" y2="20" stroke="#475569"        strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="4"  y1="12"  x2="6.2" y2="12" stroke="#475569"        strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      <line x1="17.8" y1="12" x2="20" y2="12" stroke="#475569"        strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      {/* North arrowhead — accent gradient fill */}
      <path d="M12 5.5L14 11.8L12 10.3L10 11.8Z" fill="url(#gcb-hdr)" />
      {/* South arrowhead — muted */}
      <path d="M12 18.5L10 12.2L12 13.7L14 12.2Z" fill="#475569" opacity="0.5" />
      {/* Center pivot dot */}
      <circle cx="12" cy="12" r="1.7" fill="url(#gcb-hdr)" />
      <defs>
        <linearGradient id="gcb-hdr" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#3b82f6" />
          <stop offset="50%"  stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Pulse ring overlay (for icon buttons with unreads) ──────────────────────

function PulseRing({ color }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-xl pointer-events-none"
      animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
      style={{ border: `1.5px solid ${color}` }}
      aria-hidden="true"
    />
  );
}

// ── Refined animated badge ──────────────────────────────────────────────────

function UnreadBadge({ count, gradient }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          variants={badgeAnim}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                     text-[10px] font-bold font-body flex items-center justify-center
                     text-white leading-none"
          style={{
            background: gradient,
            boxShadow: '0 2px 8px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(0,0,0,0.25)',
          }}
          aria-hidden="true"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount }              = useSelector((state) => state.notifications);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);
  const { t } = useTranslation();

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.8 }}
      className="fixed top-0 left-0 right-0 z-40 h-16 glass border-b border-surface-divider
                 flex items-center justify-between px-4 lg:px-6"
      style={{ borderRadius: 0 }}
    >

      {/* ────────────────── LEFT: hamburger · brand · live ──────────────────── */}
      <div className="flex items-center gap-2.5">

        {/* Hamburger — mobile only */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-xl hover:bg-surface-hover text-txt-secondary
                     hover:text-txt-primary transition-colors lg:hidden"
          aria-label="Toggle sidebar menu"
        >
          <HamburgerIcon />
        </motion.button>

        {/* Brand mark — compass + logotype */}
        {/* motion.div propagates whileHover="hov" down to children that declare "hov" variants */}
        <motion.div
          className="flex items-center gap-2 cursor-pointer select-none"
          role="link"
          tabIndex={0}
          aria-label={`${t('common.appName')} — go to home`}
          onClick={() => navigate('/')}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/'); }}
          whileHover="hov"
          whileTap="tap"
        >
          {/* Compass — rotates on parent hover via variant propagation */}
          <motion.span
            className="flex-shrink-0 block"
            variants={{
              hov: { rotate: 22.5, transition: { type: 'spring', stiffness: 260, damping: 18 } },
              tap: { rotate: -22.5, transition: { type: 'spring', stiffness: 400, damping: 20 } },
            }}
            aria-hidden="true"
          >
            <CompassIcon />
          </motion.span>

          {/* Logotype */}
          <h1
            className="text-xl font-heading font-bold leading-none tracking-tight
                       bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500
                       bg-clip-text text-transparent"
          >
            {t('common.appName')}
          </h1>
        </motion.div>

        {/* Live indicator — hidden on xs, visible sm+ */}
        <LiveIndicator className="hidden sm:flex" />
      </div>

      {/* ────────────────── CENTER: Desktop search trigger ──────────────────── */}
      <motion.button
        onClick={() => dispatch(setActivePanel('search'))}
        aria-label="Open search"
        className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full
                   w-[260px] xl:w-[320px] cursor-text"
        style={{
          background: 'var(--surface-hover)',
          border: '1px solid var(--surface-divider)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
        whileHover={{
          scale: 1.01,
          borderColor: 'rgba(139,92,246,0.22)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035), 0 0 0 1px rgba(139,92,246,0.1)',
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Search icon */}
        <span className="text-txt-muted flex-shrink-0">
          <SearchIcon size={14} />
        </span>

        {/* Placeholder text */}
        <span className="text-sm text-txt-muted flex-1 text-left font-body truncate">
          Search places, people…
        </span>

        {/* Keyboard hint */}
        <kbd
          className="hidden xl:inline-flex items-center gap-px px-1.5 py-0.5 rounded
                     text-[11px] font-mono text-txt-muted flex-shrink-0"
          style={{
            background: 'var(--surface-active)',
            border: '1px solid var(--surface-divider)',
          }}
          aria-label="Keyboard shortcut: Command K"
        >
          ⌘K
        </kbd>
      </motion.button>

      {/* ────────────────── RIGHT: search · notifications · messages · profile ─ */}
      <div className="flex items-center gap-0.5">

        {/* Search icon — mobile / tablet only */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => dispatch(setActivePanel('search'))}
          className="lg:hidden p-2.5 rounded-xl hover:bg-surface-hover
                     text-txt-secondary hover:text-txt-primary transition-colors"
          aria-label="Open search"
        >
          <SearchIcon size={19} />
        </motion.button>

        {/* ── Notifications ── */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => dispatch(setActivePanel('notifications'))}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer"
          style={
            unreadCount > 0
              ? {
                  backgroundColor: 'rgba(245,158,11,0.09)',
                  color: '#f59e0b',
                  boxShadow:
                    'inset 0 0 0 1px rgba(245,158,11,0.22), 0 0 14px rgba(245,158,11,0.12)',
                }
              : { color: 'var(--text-secondary)' }
          }
        >
          {unreadCount > 0 && <PulseRing color="rgba(245,158,11,0.55)" />}
          <BellIcon />
          <UnreadBadge
            count={unreadCount}
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          />
        </motion.button>

        {/* ── Messages ── */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => dispatch(setActivePanel('messages'))}
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
          className="relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer"
          style={
            unreadMessages > 0
              ? {
                  backgroundColor: 'rgba(59,130,246,0.09)',
                  color: '#3b82f6',
                  boxShadow:
                    'inset 0 0 0 1px rgba(59,130,246,0.22), 0 0 14px rgba(59,130,246,0.12)',
                }
              : { color: 'var(--text-secondary)' }
          }
        >
          {unreadMessages > 0 && <PulseRing color="rgba(59,130,246,0.55)" />}
          <ChatIcon />
          <UnreadBadge
            count={unreadMessages}
            gradient="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
          />
        </motion.button>

        {/* ── Profile avatar ── */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => dispatch(setActivePanel('profile'))}
          aria-label={`Profile${user?.name ? `, ${user.name}` : ''}`}
          className="relative ml-1.5 cursor-pointer"
        >
          {/* Soft pulsing gradient ring behind avatar */}
          <motion.span
            className="absolute rounded-full pointer-events-none"
            style={{ inset: '-3px' }}
            animate={{
              boxShadow: [
                '0 0 0 1.5px rgba(59,130,246,0.35)',
                '0 0 0 2px   rgba(6,182,212,0.5)',
                '0 0 0 1.5px rgba(59,130,246,0.35)',
              ],
            }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" online />
        </motion.button>

      </div>
    </motion.header>
  );
}
