import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setActivePanel, closePanel, setSidebarOpen, toggleSidebarExpanded } from '../../features/ui/uiSlice';
import { logout } from '../../features/auth/authSlice';
import { useTranslation } from 'react-i18next';
import Avatar from '../ui/Avatar';

/* ── Constants ─────────────────────────────────────────────────────── */
const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_EXPANDED = 240;

/* ── Animation variants ────────────────────────────────────────────── */
const sidebarVariants = {
  hidden: { x: -320, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: -320, opacity: 0, transition: { duration: 0.2 } },
};

const tooltipVariants = {
  hidden: { opacity: 0, x: -4, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, x: -4, scale: 0.96, transition: { duration: 0.1 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 400 } },
  exit: { opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.12 } },
};

/* ── Tooltip with delay ────────────────────────────────────────────── */
function Tooltip({ children, label, show }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = useCallback(() => {
    if (!show) return;
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, [show]);

  const handleLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-elevated border border-surface-divider text-txt-primary text-xs font-medium rounded-lg shadow-md whitespace-nowrap pointer-events-none"
          >
            {label}
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-elevated" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Section label ─────────────────────────────────────────────────── */
function SectionLabel({ label, expanded }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-semibold uppercase tracking-widest text-txt-muted select-none"
          >
            {label}
          </motion.span>
        ) : (
          <motion.div
            key="dot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto w-4 h-px bg-surface-divider"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Nav item ──────────────────────────────────────────────────────── */
function NavItem({ item, isActive, expanded, badge, onClick }) {
  return (
    <Tooltip label={item.label} show={!expanded}>
      <button
        onClick={onClick}
        className={`relative w-full flex items-center gap-3 rounded-xl transition-all duration-150 group
          ${expanded ? 'px-3 h-11' : 'justify-center h-11 mx-auto'}
          ${isActive
            ? 'bg-accent-primary/12 text-accent-primary'
            : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-hover'
          }`}
        style={expanded ? {} : { width: 44 }}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Active indicator pill — Discord-style left bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-accent-primary"
              style={{ height: expanded ? 24 : 20 }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            />
          )}
        </AnimatePresence>

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <path d={item.icon} />
        </svg>

        {/* Label (expanded only) */}
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge */}
        {badge > 0 && (
          <span className={`flex-shrink-0 min-w-[18px] h-[18px] bg-accent-primary rounded-full text-[10px] font-bold flex items-center justify-center text-white
            ${expanded ? 'ml-auto' : 'absolute -top-1 -right-1'}`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

/* ── User dropdown menu ────────────────────────────────────────────── */
function UserMenu({ user, expanded, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const menuItems = [
    {
      label: t('nav.profile', 'My Profile'),
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      action: () => { dispatch(setActivePanel('profile')); onClose(); },
    },
    {
      label: t('common.settings', 'Settings'),
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      iconExtra: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      action: () => { navigate('/settings'); onClose(); },
    },
    { type: 'divider' },
    {
      label: t('common.logout', 'Log out'),
      icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      action: () => { dispatch(logout()); onClose(); },
      danger: true,
    },
  ];

  return (
    <motion.div
      ref={menuRef}
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`absolute z-50 glass border border-surface-divider shadow-lg rounded-xl py-1.5 min-w-[180px]
        ${expanded ? 'bottom-full mb-2 left-0 right-0' : 'bottom-0 left-full ml-3'}`}
      role="menu"
    >
      {/* User info header */}
      <div className="px-3 py-2 border-b border-surface-divider">
        <p className="text-sm font-medium text-txt-primary truncate">{user?.name || 'User'}</p>
        <p className="text-xs text-txt-muted truncate">@{user?.username || 'user'}</p>
      </div>

      {menuItems.map((item, i) =>
        item.type === 'divider' ? (
          <div key={`divider-${i}`} className="my-1 border-t border-surface-divider" />
        ) : (
          <button
            key={item.label}
            onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
              ${item.danger
                ? 'text-accent-danger hover:bg-accent-danger/10'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
              }`}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
              {item.iconExtra && <path d={item.iconExtra} />}
            </svg>
            {item.label}
          </button>
        ),
      )}
    </motion.div>
  );
}

/* ── Main Sidebar ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { sidebarOpen, sidebarExpanded, activePanel, isMobile } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);

  const expanded = !isMobile && sidebarExpanded;
  const isVisible = isMobile ? sidebarOpen : true;

  /* ── Navigation sections ── */
  const sections = [
    {
      label: t('nav.sectionMain', 'Main'),
      items: [
        { id: 'feed', label: t('nav.feed', 'Feed'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'explore', label: t('nav.explore', 'Explore'), icon: 'M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z', path: '/explore' },
        { id: 'activity', label: t('nav.activity', 'Activity'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', path: '/activity' },
      ],
    },
    {
      label: t('nav.sectionContent', 'Content'),
      items: [
        { id: 'collections', label: t('nav.collections', 'Collections'), icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', path: '/collections' },
        { id: 'events', label: t('nav.events', 'Events'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      ],
    },
    {
      label: t('nav.sectionSocial', 'Social'),
      items: [
        { id: 'messages', label: t('nav.messages', 'Messages'), icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: 'messages' },
      ],
    },
  ];

  const handleNavClick = useCallback((item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      dispatch(setActivePanel(activePanel === item.id ? null : item.id));
    }
    if (isMobile) dispatch(setSidebarOpen(false));
  }, [navigate, dispatch, activePanel, isMobile]);

  const isItemActive = useCallback((item) => {
    return item.path ? location.pathname === item.path : activePanel === item.id;
  }, [location.pathname, activePanel]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Mobile overlay backdrop */}
          {isMobile && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(setSidebarOpen(false))}
            />
          )}

          <motion.aside
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-16 left-0 bottom-0 z-30 glass border-r border-surface-divider flex flex-col overflow-hidden"
            style={{
              width: isMobile ? SIDEBAR_EXPANDED : expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
              transition: isMobile ? undefined : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            role="navigation"
            aria-label="Main navigation"
          >
            {/* ── Nav sections ── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 sidebar-scroll">
              {sections.map((section) => (
                <div key={section.label}>
                  <SectionLabel label={section.label} expanded={expanded || isMobile} />
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isItemActive(item)}
                        expanded={expanded || isMobile}
                        badge={item.badge === 'messages' ? unreadMessages : 0}
                        onClick={() => handleNavClick(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* ── Bottom section: user profile + expand toggle ── */}
            <div className="border-t border-surface-divider px-2.5 py-3 flex flex-col gap-2 relative">
              {/* User profile button */}
              <Tooltip label={user?.name || 'Profile'} show={!expanded && !isMobile}>
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 hover:bg-surface-hover
                    ${expanded || isMobile ? 'px-2.5 py-2' : 'justify-center py-2'}`}
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <Avatar
                    src={user?.avatar}
                    name={user?.name || 'User'}
                    size="sm"
                    online
                  />
                  <AnimatePresence>
                    {(expanded || isMobile) && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-txt-primary truncate leading-tight">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-[11px] text-txt-muted truncate leading-tight">
                          {t('common.online', 'Online')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {(expanded || isMobile) && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-txt-muted flex-shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  )}
                </button>
              </Tooltip>

              {/* User dropdown menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <UserMenu
                    user={user}
                    expanded={expanded || isMobile}
                    onClose={() => setUserMenuOpen(false)}
                  />
                )}
              </AnimatePresence>

              {/* Expand/Collapse toggle (desktop only) */}
              {!isMobile && (
                <Tooltip label={expanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')} show={!expanded}>
                  <button
                    onClick={() => dispatch(toggleSidebarExpanded())}
                    className="w-full flex items-center justify-center h-9 rounded-xl text-txt-muted hover:text-txt-secondary hover:bg-surface-hover transition-all duration-150"
                    aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                  >
                    <motion.svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <path d="M13 17l5-5-5-5" />
                      <path d="M6 17l5-5-5-5" />
                    </motion.svg>
                  </button>
                </Tooltip>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
