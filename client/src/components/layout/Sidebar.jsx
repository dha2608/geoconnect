import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  setSidebarOpen,
  setActivePanel,
  closePanel,
} from '../../features/ui/uiSlice';
import { logout as logoutAction } from '../../features/auth/authSlice';
import Avatar from '../ui/Avatar';

/* ── Constants ─────────────────────────────────────────────────────── */
const RAIL_W = 72;     // Desktop icon-rail width (px)
const MOBILE_W = 280;  // Mobile drawer width (px)

/* ═══════════════════════════════════════════════════════════════════
   TOOLTIP — appears to the right of icon on hover (desktop only)
   ═══════════════════════════════════════════════════════════════════ */
function Tooltip({ label, visible, parentRef }) {
  if (!visible || !parentRef.current) return null;
  const rect = parentRef.current.getBoundingClientRect();
  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ top: rect.top + rect.height / 2, left: rect.right + 12, transform: 'translateY(-50%)' }}
    >
      <motion.div
        initial={{ opacity: 0, x: -4, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="rounded-lg bg-[#111] px-3 py-1.5 text-[13px] font-semibold text-white shadow-xl whitespace-nowrap"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
      >
        {label}
        {/* Arrow pointing left */}
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
          <div className="border-4 border-transparent border-r-[#111]" />
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NAV ICON — Discord-style: circle → rounded-rect on hover/active
   Left pill indicator for active/hover/unread
   ═══════════════════════════════════════════════════════════════════ */
const NavIcon = memo(function NavIcon({ icon, label, isActive, badge, hasUnread, onClick, expanded }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const handleEnter = () => { timerRef.current = setTimeout(() => setHovered(true), 80); };
  const handleLeave = () => { clearTimeout(timerRef.current); setHovered(false); };

  // Pill height: active=40px, hover=20px, unread=8px
  const showPill = isActive || hovered || hasUnread;
  const pillHeight = isActive ? 40 : hovered ? 20 : 8;

  return (
    <div
      className="relative flex items-center justify-center"
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* ── Left pill indicator ── */}
      {!expanded && (
        <AnimatePresence>
          {showPill && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: pillHeight }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute -left-[2px] w-[4px] rounded-r-full bg-white"
            />
          )}
        </AnimatePresence>
      )}

      {/* ── Icon button ── */}
      <motion.button
        onClick={onClick}
        animate={{
          borderRadius: isActive || hovered ? 16 : 24,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`
          relative flex items-center overflow-hidden transition-colors duration-200
          ${expanded
            ? `w-full h-10 gap-3 px-3 rounded-lg ${isActive ? 'bg-white/[0.12] text-white' : 'text-txt-muted hover:bg-white/[0.06] hover:text-white'}`
            : `w-12 h-12 justify-center mx-auto ${isActive ? 'bg-accent-primary text-white' : 'bg-white/[0.06] text-txt-muted hover:bg-accent-primary hover:text-white'}`
          }
        `}
        aria-label={label}
        aria-pressed={isActive}
      >
        <svg
          className={`shrink-0 relative z-10 ${expanded ? 'h-[18px] w-[18px]' : 'h-5 w-5'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={isActive ? 2.2 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>

        {expanded && (
          <span className="text-[13px] font-medium truncate relative z-10">{label}</span>
        )}

        {/* Badge */}
        {badge > 0 && (
          <span className={`
            ${expanded
              ? 'ml-auto min-w-[20px] h-5 px-1.5'
              : 'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1'}
            flex items-center justify-center
            rounded-full bg-accent-danger text-[10px] font-bold text-white
            ring-[3px] ring-base
          `}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.button>

      {/* Tooltip (desktop only) */}
      {!expanded && <Tooltip label={label} visible={hovered && !isActive} parentRef={ref} />}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   SEPARATOR — thin line with spacing (Discord-style)
   ═══════════════════════════════════════════════════════════════════ */
function Separator({ expanded }) {
  return (
    <div className={`${expanded ? 'mx-3' : 'mx-auto w-8'} my-2 h-[2px] rounded-full bg-white/[0.06]`} />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USER MENU — bottom section with avatar + dropdown
   ═══════════════════════════════════════════════════════════════════ */
function UserMenu({ expanded, user, isAuthenticated, onLogout, isMobile, dispatch }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const menuAction = useCallback((path) => {
    setOpen(false);
    navigate(path);
    if (isMobile) dispatch(setSidebarOpen(false));
  }, [navigate, isMobile, dispatch]);

  return (
    <div ref={menuRef} className={`relative ${expanded ? 'px-3 pb-3 pt-2' : 'pb-3 pt-2 flex justify-center'}`}>
      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`
              absolute z-50 overflow-hidden rounded-xl bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl
              ${expanded ? 'bottom-full mb-2 left-3 right-3' : 'bottom-0 left-full ml-3 w-52'}
            `}
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
          >
            {/* User info header */}
            {isAuthenticated && (
              <div className="px-3 py-2.5 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                {user?.email && <p className="text-[11px] text-txt-muted truncate mt-0.5">{user.email}</p>}
              </div>
            )}

            <div className="p-1.5">
              {isAuthenticated ? (
                <>
                  <MenuItem icon="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" iconExtra="M12 7a4 4 0 100-8 4 4 0 000 8z" label="Profile" onClick={() => menuAction('/profile')} />
                  <MenuItem icon="M12 15a3 3 0 100-6 3 3 0 000 6z" iconExtra="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" label="Settings" onClick={() => menuAction('/settings')} />
                  <div className="mx-2 my-1 h-px bg-white/[0.06]" />
                  <MenuItem icon="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" label="Log out" danger onClick={() => { setOpen(false); onLogout(); }} />
                </>
              ) : (
                <>
                  <MenuItem icon="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" label="Sign in" onClick={() => menuAction('/login')} />
                  <MenuItem icon="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" label="Create account" accent onClick={() => menuAction('/register')} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          flex items-center transition-colors duration-150 rounded-full
          ${expanded
            ? 'w-full gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06]'
            : 'w-12 h-12 justify-center mx-auto hover:ring-2 hover:ring-accent-primary/50'}
        `}
        aria-label={user?.name || 'User menu'}
      >
        <div className={`relative ${!expanded ? 'w-12 h-12 flex items-center justify-center' : ''}`}>
          <Avatar src={user?.avatar} name={user?.name || 'Guest'} size="sm" />
          {/* Online indicator */}
          {isAuthenticated && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-success ring-[3px] ring-base" />
          )}
        </div>
        {expanded && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-white truncate">
                {isAuthenticated ? (user?.name || 'User') : 'Guest'}
              </p>
              <p className="text-[11px] text-txt-muted truncate">
                {isAuthenticated ? 'Online' : 'Not signed in'}
              </p>
            </div>
            <svg className={`h-4 w-4 text-txt-muted transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </>
        )}
      </motion.button>
    </div>
  );
}

/* ── Menu Item inside dropdown ── */
function MenuItem({ icon, iconExtra, label, onClick, danger, accent }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors
        ${danger
          ? 'text-accent-danger hover:bg-accent-danger/10'
          : accent
            ? 'text-accent-primary hover:bg-accent-primary/10'
            : 'text-txt-secondary hover:bg-white/[0.06] hover:text-white'}
      `}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
        {iconExtra && <path d={iconExtra} />}
      </svg>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SIDEBAR — Discord/Slack style icon rail
   ═══════════════════════════════════════════════════════════════════ */
export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { sidebarOpen, activePanel, isMobile } = useSelector((state) => state.ui);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);
  const { unreadCount: unreadNotifications } = useSelector((state) => state.notifications);

  const expanded = isMobile; // Mobile always expanded, desktop always icon-only rail

  /* ── Navigation items ── */
  const NAV_ITEMS = [
    { id: 'feed', label: t('nav.feed', 'Feed'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'explore', label: t('nav.explore', 'Explore'), icon: 'M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z', path: '/explore' },
    { id: 'search', label: t('nav.search', 'Search'), icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    null, // separator
    { id: 'activity', label: t('nav.activity', 'Activity'), icon: 'M13 10V3L4 14h7v7l9-11h-7z', path: '/activity' },
    { id: 'collections', label: t('nav.collections', 'Collections'), icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', path: '/collections' },
    { id: 'events', label: t('nav.events', 'Events'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', path: '/events' },
    null, // separator
    { id: 'notifications', label: t('nav.notifications', 'Notifications'), icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: 'notifications' },
    { id: 'messages', label: t('nav.messages', 'Messages'), icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: 'messages' },
    { id: 'leaderboard', label: t('nav.leaderboard', 'Leaderboard'), icon: 'M16 8V2H8v6M2 8h20l-2 12H4L2 8zM12 12v4', path: '/leaderboard' },
  ];

  /* ── Helpers ── */
  const isItemActive = useCallback((item) => {
    if (item.path) return location.pathname === item.path;
    return activePanel === item.id;
  }, [location.pathname, activePanel]);

  const handleNavClick = useCallback((item) => {
    if (item.path) {
      navigate(item.path);
      dispatch(closePanel());
    } else {
      dispatch(setActivePanel(activePanel === item.id ? null : item.id));
    }
    if (isMobile) dispatch(setSidebarOpen(false));
  }, [dispatch, navigate, activePanel, isMobile]);

  const getBadge = useCallback((item) => {
    if (item.badge === 'messages') return unreadMessages;
    if (item.badge === 'notifications') return unreadNotifications;
    return 0;
  }, [unreadMessages, unreadNotifications]);

  const handleLogout = useCallback(async () => {
    await dispatch(logoutAction()).unwrap();
    navigate('/welcome');
  }, [dispatch, navigate]);

  const isVisible = isMobile ? sidebarOpen : true;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[38] bg-black/60 backdrop-blur-[3px]"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
      </AnimatePresence>

      {/* Sidebar rail */}
      <AnimatePresence>
        {isVisible && (
          <motion.aside
            data-tour="sidebar"
            initial={isMobile ? { x: -MOBILE_W } : false}
            animate={isMobile ? { x: 0 } : undefined}
            exit={isMobile ? { x: -MOBILE_W } : undefined}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className={`
              fixed top-0 bottom-0 left-0 z-[39] flex flex-col
              ${isMobile
                ? 'bg-[#0c0f18]/98 backdrop-blur-2xl border-r border-white/[0.06]'
                : 'bg-[#0c0f18]'
              }
            `}
            style={{ width: isMobile ? MOBILE_W : RAIL_W }}
          >
            {/* ── Logo ── */}
            <div className={`flex items-center shrink-0 ${expanded ? 'h-16 px-4 gap-3' : 'h-16 justify-center'}`}>
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-violet cursor-pointer"
                whileHover={{ borderRadius: 16, scale: 1.05, rotate: 4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => {
                  if (isMobile) dispatch(setSidebarOpen(false));
                  navigate('/');
                }}
              >
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </motion.div>
              {expanded && (
                <span className="font-heading text-lg font-bold tracking-tight text-white">GeoConnect</span>
              )}
              {/* Mobile close */}
              {isMobile && (
                <button
                  onClick={() => dispatch(setSidebarOpen(false))}
                  className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-txt-muted hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* ── Separator under logo ── */}
            <Separator expanded={expanded} />

            {/* ── Navigation ── */}
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${expanded ? 'px-3 py-1' : 'py-1'}`}>
              <div className={`flex flex-col ${expanded ? 'gap-0.5' : 'items-center gap-2'}`}>
                {NAV_ITEMS.map((item, i) =>
                  item === null ? (
                    <Separator key={`sep-${i}`} expanded={expanded} />
                  ) : (
                    <NavIcon
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      isActive={isItemActive(item)}
                      badge={getBadge(item)}
                      hasUnread={getBadge(item) > 0 && !isItemActive(item)}
                      onClick={() => handleNavClick(item)}
                      expanded={expanded}
                    />
                  )
                )}
              </div>
            </nav>

            {/* ── Separator above user ── */}
            <Separator expanded={expanded} />

            {/* ── User section ── */}
            <UserMenu
              expanded={expanded}
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={handleLogout}
              isMobile={isMobile}
              dispatch={dispatch}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
