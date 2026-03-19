import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setActivePanel, openModal } from '../../features/ui/uiSlice';
import { useTranslation } from 'react-i18next';

/* ── Icon components ───────────────────────────────────────────────── */

const FeedIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ExploreIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z" />
  </svg>
);

const EventsIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ProfileIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PlusIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 4v16m8-8H4" />
  </svg>
);

/* ── Create popup icons ────────────────────────────────────────────── */

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

/* ── Animation variants ────────────────────────────────────────────── */

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

/* ── Nav item ──────────────────────────────────────────────────────── */

function NavItem({ id, label, Icon, isActive, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      className="relative flex flex-col items-center justify-center gap-0.5 w-14 h-14"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active indicator pill */}
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="absolute -top-1 w-8 h-1 rounded-full bg-accent-primary"
          transition={{ type: 'spring', damping: 28, stiffness: 400 }}
          style={{ boxShadow: '0 0 8px rgba(59,130,246,0.4)' }}
        />
      )}

      <Icon
        className={`transition-colors duration-150 ${
          isActive ? 'text-accent-primary' : 'text-txt-muted'
        }`}
      />
      <span
        className={`text-[10px] font-body transition-colors duration-150 ${
          isActive ? 'text-accent-primary font-medium' : 'text-txt-muted'
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

/* ── Create menu option ────────────────────────────────────────────── */

function CreateOption({ icon: Icon, label, color, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 px-5 py-3 rounded-2xl glass border border-surface-divider
        hover:border-${color}/30 transition-all duration-150`}
    >
      <div className={`w-11 h-11 rounded-xl bg-${color}/12 flex items-center justify-center text-${color}`}>
        <Icon />
      </div>
      <span className="text-xs font-medium text-txt-secondary">{label}</span>
    </motion.button>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function MobileNav() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { activePanel } = useSelector((state) => state.ui);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navItems = [
    {
      id: 'feed',
      label: t('nav.feed', 'Feed'),
      Icon: FeedIcon,
      isActive: activePanel === 'feed',
      action: () => dispatch(setActivePanel(activePanel === 'feed' ? null : 'feed')),
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
      id: 'events',
      label: t('nav.events', 'Events'),
      Icon: EventsIcon,
      isActive: activePanel === 'events',
      action: () => dispatch(setActivePanel(activePanel === 'events' ? null : 'events')),
    },
    {
      id: 'profile',
      label: t('nav.profile', 'Profile'),
      Icon: ProfileIcon,
      isActive: activePanel === 'profile',
      action: () => dispatch(setActivePanel(activePanel === 'profile' ? null : 'profile')),
    },
  ];

  // Keyboard nav + Escape for create menu
  useEffect(() => {
    if (!createMenuOpen) return;
    const el = menuRef.current;
    if (!el) return;
    const buttons = el.querySelectorAll('button');
    if (buttons.length) buttons[0].focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') { setCreateMenuOpen(false); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = Array.from(buttons).indexOf(document.activeElement);
        const next = e.key === 'ArrowRight' ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [createMenuOpen]);

  const handleCreate = useCallback((type) => {
    setCreateMenuOpen(false);
    dispatch(openModal({ type }));
  }, [dispatch]);

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-divider lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 relative">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <div key="create" className="relative flex items-center justify-center w-14">
                {/* Create button - floating */}
                <motion.button
                  onClick={() => setCreateMenuOpen((prev) => !prev)}
                  whileTap={{ scale: 0.9 }}
                  animate={{ rotate: createMenuOpen ? 45 : 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="w-12 h-12 -mt-5 rounded-full flex items-center justify-center text-white relative"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                    boxShadow: '0 4px 20px rgba(139,92,246,0.35), 0 0 40px rgba(6,182,212,0.15)',
                  }}
                  aria-label={t('nav.create', 'Create')}
                  aria-expanded={createMenuOpen}
                  aria-haspopup="menu"
                >
                  <PlusIcon />
                </motion.button>
              </div>
            );
          }

          return (
            <NavItem
              key={item.id}
              id={item.id}
              label={item.label}
              Icon={item.Icon}
              isActive={item.isActive}
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

            {/* Menu */}
            <motion.div
              ref={menuRef}
              variants={createMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="menu"
              aria-label={t('nav.createOptions', 'Create options')}
              className="absolute bottom-[76px] left-1/2 -translate-x-1/2 flex gap-3 p-3 glass rounded-2xl border border-surface-divider shadow-xl"
              style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.3), 0 0 20px rgba(139,92,246,0.1)' }}
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

      {/* Safe area spacer for notch phones */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </motion.nav>
  );
}
