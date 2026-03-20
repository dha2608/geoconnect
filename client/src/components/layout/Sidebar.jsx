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
const SIDEBAR_W = 56; // Desktop icon-only width (px)
const MOBILE_W = 260; // Mobile drawer width (px)

/* ── Tooltip ───────────────────────────────────────────────────────── */
function Tooltip({ label, visible, parentRef }) {
  if (!visible || !parentRef.current) return null;
  const rect = parentRef.current.getBoundingClientRect();
  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ top: rect.top + rect.height / 2, left: rect.right + 10, transform: 'translateY(-50%)' }}
    >
      <div className="rounded-md bg-elevated/95 backdrop-blur-sm border border-surface-divider px-2.5 py-1 text-xs font-medium text-txt-primary shadow-lg whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

/* ── NavItem ───────────────────────────────────────────────────────── */
const NavItem = memo(function NavItem({ icon, label, isActive, badge, onClick, expanded }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setHovered(true), 100);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setHovered(false);
  };

  return (
    <div className="relative" ref={ref} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={onClick}
        className={`
          group relative flex items-center w-full rounded-lg transition-all duration-150
          ${expanded ? 'h-9 gap-3 px-3' : 'h-9 w-9 mx-auto justify-center'}
          ${isActive
            ? 'bg-white/[0.08] text-txt-primary'
            : 'text-txt-muted hover:bg-white/[0.05] hover:text-txt-secondary'}
        `}
        aria-label={label}
        aria-pressed={isActive}
      >
        {/* Active dot indicator (collapsed) */}
        {isActive && !expanded && (
          <motion.div
            layoutId="sidebar-dot"
            className="absolute -left-[2px] top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-accent-primary"
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          />
        )}

        {/* Active pill (expanded) */}
        {isActive && expanded && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-lg bg-white/[0.08]"
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          />
        )}

        <svg className="h-[18px] w-[18px] shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>

        {expanded && (
          <span className="text-[13px] font-medium truncate relative z-10">{label}</span>
        )}

        {/* Badge */}
        {badge > 0 && (
          <span className={`
            ${expanded ? 'ml-auto' : 'absolute -top-0.5 -right-0.5'}
            min-w-[16px] h-4 px-1 flex items-center justify-center
            rounded-full bg-accent-primary text-[10px] font-bold text-white
          `}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {/* Tooltip (collapsed only) */}
      {!expanded && <Tooltip label={label} visible={hovered} parentRef={ref} />}
    </div>
  );
});

/* ── Divider ───────────────────────────────────────────────────────── */
function Divider() {
  return <div className="mx-3 my-1.5 h-px bg-surface-divider/50" />;
}

/* ── Main Sidebar ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { sidebarOpen, activePanel, isMobile } = useSelector((state) => state.ui);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);
  const { unreadCount: unreadNotifications } = useSelector((state) => state.notifications);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const expanded = isMobile; // Mobile always expanded, desktop always icon-only

  /* ── Navigation items (flat, no sections in collapsed) ── */
  const NAV_ITEMS = [
    { id: 'feed', label: t('nav.feed', 'Feed'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'explore', label: t('nav.explore', 'Explore'), icon: 'M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z', path: '/explore' },
    { id: 'search', label: t('nav.search', 'Search'), icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    null, // divider
    { id: 'activity', label: t('nav.activity', 'Activity'), icon: 'M13 10V3L4 14h7v7l9-11h-7z', path: '/activity' },
    { id: 'collections', label: t('nav.collections', 'Collections'), icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', path: '/collections' },
    { id: 'events', label: t('nav.events', 'Events'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', path: '/events' },
    null, // divider
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

  /* ── Close user menu on outside click ── */
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  /* ── Close user menu on Escape ── */
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userMenuOpen]);

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    await dispatch(logoutAction()).unwrap();
    navigate('/welcome');
  }, [dispatch, navigate]);

  /* ── Render ── */
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
            className="fixed inset-0 z-[38] bg-black/50 backdrop-blur-[2px]"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
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
              bg-base/95 backdrop-blur-xl border-r border-surface-divider/40
              ${isMobile ? '' : ''}
            `}
            style={{ width: isMobile ? MOBILE_W : SIDEBAR_W }}
          >
            {/* Logo area */}
            <div className={`flex items-center shrink-0 ${expanded ? 'h-14 px-4 gap-3' : 'h-14 justify-center'}`}>
              <motion.div
                className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-500"
                whileHover={{ rotate: 8, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </motion.div>
              {expanded && (
                <span className="font-heading text-sm font-bold tracking-tight text-txt-primary">GeoConnect</span>
              )}
              {/* Mobile close button */}
              {isMobile && (
                <button
                  onClick={() => dispatch(setSidebarOpen(false))}
                  className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/[0.05] transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-2 ${expanded ? 'px-3' : 'px-2'}`}>
              <div className="flex flex-col gap-0.5">
                {NAV_ITEMS.map((item, i) =>
                  item === null ? (
                    <Divider key={`d-${i}`} />
                  ) : (
                    <NavItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      isActive={isItemActive(item)}
                      badge={getBadge(item)}
                      onClick={() => handleNavClick(item)}
                      expanded={expanded}
                    />
                  )
                )}
              </div>
            </nav>

            {/* User section */}
            <div ref={userMenuRef} className={`relative shrink-0 border-t border-surface-divider/40 ${expanded ? 'p-3' : 'py-3 flex justify-center'}`}>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className={`
                      absolute z-50 overflow-hidden rounded-lg bg-elevated/95 backdrop-blur-xl border border-surface-divider shadow-xl
                      ${expanded ? 'bottom-full mb-2 left-3 right-3' : 'bottom-0 left-full ml-2 w-44'}
                    `}
                  >
                    <div className="p-1">
                      {isAuthenticated ? (
                        <>
                          <button
                            onClick={() => { setUserMenuOpen(false); navigate('/profile'); if (isMobile) dispatch(setSidebarOpen(false)); }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-txt-secondary hover:bg-white/[0.05] hover:text-txt-primary transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            Profile
                          </button>
                          <button
                            onClick={() => { setUserMenuOpen(false); navigate('/settings'); if (isMobile) dispatch(setSidebarOpen(false)); }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-txt-secondary hover:bg-white/[0.05] hover:text-txt-primary transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                            Settings
                          </button>
                          <div className="mx-1.5 my-1 h-px bg-surface-divider/50" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            Log out
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setUserMenuOpen(false); navigate('/login'); }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-txt-secondary hover:bg-white/[0.05] hover:text-txt-primary transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                            Sign in
                          </button>
                          <button
                            onClick={() => { setUserMenuOpen(false); navigate('/register'); }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-accent-primary hover:bg-accent-primary/10 transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                            Create account
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`
                  flex items-center rounded-lg transition-colors duration-150
                  hover:bg-white/[0.05]
                  ${expanded ? 'w-full gap-3 px-2 py-2' : 'w-9 h-9 justify-center mx-auto'}
                `}
                aria-label={user?.name || 'User menu'}
              >
                <Avatar
                  src={user?.avatar}
                  name={user?.name || 'Guest'}
                  size="xs"
                />
                {expanded && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[13px] font-medium text-txt-primary truncate">
                      {isAuthenticated ? (user?.name || 'User') : 'Guest'}
                    </p>
                    {isAuthenticated && user?.email && (
                      <p className="text-[11px] text-txt-muted truncate">{user.email}</p>
                    )}
                  </div>
                )}
                {expanded && (
                  <svg className={`h-3.5 w-3.5 text-txt-muted transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                )}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
