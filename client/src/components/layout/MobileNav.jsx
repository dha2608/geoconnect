import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setActivePanel, openModal } from '../../features/ui/uiSlice';
import { useTranslation } from 'react-i18next';
import useRequireAuth from '../../hooks/useRequireAuth';

/* ── Nav icons (20×20, support active/inactive fill states) ─────────── */

const MapIcon = ({ active, ...props }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke={active ? 'none' : 'currentColor'}
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ExploreIcon = ({ active, ...props }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke={active ? 'none' : 'currentColor'}
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z" />
  </svg>
);

const MessagesIcon = ({ active, ...props }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke={active ? 'none' : 'currentColor'}
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ProfileIcon = ({ active, ...props }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke={active ? 'none' : 'currentColor'}
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PlusIcon = (props) => (
  <svg
    width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    {...props}
  >
    <path d="M12 4v16m8-8H4" />
  </svg>
);

/* ── Create popup icons ──────────────────────────────────────────────── */

const PinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

const PenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const CalendarPlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    <path d="M12 11v4m-2-2h4" />
  </svg>
);

/* ── Animation variants ──────────────────────────────────────────────── */

const createMenuVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 380 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 20,
    transition: { duration: 0.15 },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/* ── NavItem ─────────────────────────────────────────────────────────── */

function NavItem({ label, Icon, isActive, onClick, badge }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 min-w-0"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active top-edge pill */}
      {isActive && (
        <motion.span
          layoutId="mobile-nav-active-pill"
          className="absolute top-0 w-8 h-0.5 rounded-full bg-accent-primary"
          transition={{ type: 'spring', damping: 28, stiffness: 400 }}
        />
      )}

      {/* Icon with optional unread badge */}
      <div className="relative">
        <Icon
          active={isActive}
          className={`transition-colors duration-150 ${
            isActive ? 'text-accent-primary' : 'text-txt-muted'
          }`}
        />
        {badge && (
          <span
            aria-label="Unread messages"
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-danger rounded-full ring-2 ring-surface-base"
          />
        )}
      </div>

      {/* Label */}
      <span
        className={`text-[11px] leading-none transition-colors duration-150 ${
          isActive ? 'text-accent-primary font-medium' : 'text-txt-muted font-normal'
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

/* ── CreateOption ────────────────────────────────────────────────────── */

// Design-token–based color styles (JIT requires static class names; no dynamic strings)
const COLOR_STYLES = {
  'accent-primary':   { bg: 'bg-accent-primary/12',  text: 'text-accent-primary',  border: 'hover:border-accent-primary/30'  },
  'accent-secondary': { bg: 'bg-accent-violet/12',   text: 'text-accent-violet',   border: 'hover:border-accent-violet/30'   },
  'accent-success':   { bg: 'bg-accent-success/12',  text: 'text-accent-success',  border: 'hover:border-accent-success/30'  },
};

function CreateOption({ icon: Icon, label, color, onClick }) {
  const styles = COLOR_STYLES[color] ?? COLOR_STYLES['accent-primary'];
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-5 py-3 rounded-2xl glass border border-surface-divider
        ${styles.border} transition-all duration-150`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${styles.bg} ${styles.text}`}>
        <Icon />
      </div>
      <span className="text-xs font-medium text-txt-secondary">{label}</span>
    </motion.button>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function MobileNav() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { activePanel } = useSelector((state) => state.ui);
  const unreadCount = useSelector((state) => state.notifications?.unreadCount ?? 0);
  const { requireAuth, AuthGate } = useRequireAuth();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navItems = [
    {
      id: 'map',
      label: t('nav.map', 'Map'),
      Icon: MapIcon,
      isActive: location.pathname === '/',
      action: () => navigate('/'),
    },
    {
      id: 'explore',
      label: t('nav.explore', 'Explore'),
      Icon: ExploreIcon,
      isActive: location.pathname === '/explore',
      action: () => navigate('/explore'),
    },
    { id: 'create', isAction: true },
    {
      id: 'messages',
      label: t('nav.messages', 'Messages'),
      Icon: MessagesIcon,
      isActive: activePanel === 'messages',
      badge: unreadCount > 0,
      action: () => dispatch(setActivePanel(activePanel === 'messages' ? null : 'messages')),
    },
    {
      id: 'profile',
      label: t('nav.profile', 'Profile'),
      Icon: ProfileIcon,
      isActive: activePanel === 'profile',
      action: () => dispatch(setActivePanel(activePanel === 'profile' ? null : 'profile')),
    },
  ];

  // Keyboard navigation + Escape for create menu
  useEffect(() => {
    if (!createMenuOpen) return;
    const el = menuRef.current;
    if (!el) return;
    const buttons = el.querySelectorAll('button');
    if (buttons.length) buttons[0].focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setCreateMenuOpen(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = Array.from(buttons).indexOf(document.activeElement);
        const next =
          e.key === 'ArrowRight'
            ? (idx + 1) % buttons.length
            : (idx - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [createMenuOpen]);

  const handleCreate = useCallback(
    (type) => {
      setCreateMenuOpen(false);
      if (!requireAuth('create content')) return;
      dispatch(openModal({ type }));
    },
    [dispatch, requireAuth],
  );

  return (
    <>
      {AuthGate}

      <motion.nav
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-divider lg:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Tab row */}
        <div className="flex items-center h-16 px-1 relative">
          {navItems.map((item) => {
            /* ── Create FAB (center) ── */
            if (item.isAction) {
              return (
                <div key="create" className="relative flex flex-1 items-center justify-center">
                  <motion.button
                    onClick={() => setCreateMenuOpen((prev) => !prev)}
                    whileTap={{ scale: 0.9 }}
                    animate={{ rotate: createMenuOpen ? 45 : 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="w-12 h-12 -mt-5 rounded-full flex items-center justify-center text-white
                      bg-gradient-to-br from-accent-primary to-accent-violet
                      shadow-[0_4px_16px_color-mix(in_srgb,var(--accent-violet)_35%,transparent)]"
                    aria-label={t('nav.create', 'Create')}
                    aria-expanded={createMenuOpen}
                    aria-haspopup="menu"
                    data-tour="create-button"
                  >
                    <PlusIcon />
                  </motion.button>
                </div>
              );
            }

            /* ── Regular nav items ── */
            return (
              <NavItem
                key={item.id}
                label={item.label}
                Icon={item.Icon}
                isActive={item.isActive}
                badge={item.badge}
                onClick={() => {
                  setCreateMenuOpen(false);
                  item.action();
                }}
              />
            );
          })}
        </div>

        {/* ── Create menu popup ── */}
        <AnimatePresence>
          {createMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-[-1] bg-black/30 backdrop-blur-sm"
                onClick={() => setCreateMenuOpen(false)}
              />

              {/* Menu card */}
              <motion.div
                ref={menuRef}
                variants={createMenuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="menu"
                aria-label={t('nav.createOptions', 'Create options')}
                className="absolute bottom-[76px] left-1/2 -translate-x-1/2 flex gap-3 p-3 glass rounded-2xl border border-surface-divider"
                style={{
                  boxShadow:
                    '0 -8px 40px rgba(0,0,0,0.25), 0 0 24px color-mix(in srgb, var(--accent-violet) 10%, transparent)',
                }}
              >
                <CreateOption
                  icon={PinIcon}
                  label={t('pins.pin', 'Pin')}
                  color="accent-primary"
                  onClick={() => handleCreate('createPin')}
                />
                <CreateOption
                  icon={PenIcon}
                  label={t('posts.post', 'Post')}
                  color="accent-secondary"
                  onClick={() => handleCreate('createPost')}
                />
                <CreateOption
                  icon={CalendarPlusIcon}
                  label={t('events.event', 'Event')}
                  color="accent-success"
                  onClick={() => handleCreate('createEvent')}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Safe-area spacer for notch/home-indicator phones */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </motion.nav>
    </>
  );
}
