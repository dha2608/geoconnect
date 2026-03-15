import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setActivePanel, closePanel, setSidebarOpen } from '../../features/ui/uiSlice';
import { useTranslation } from 'react-i18next';

const sidebarVariants = {
  hidden: { x: -320, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { x: -320, opacity: 0, transition: { duration: 0.2 } },
};

export default function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { id: 'feed', label: t('nav.feed'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'explore', label: t('nav.explore'), icon: 'M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z', path: '/explore' },
    { id: 'activity', label: t('nav.activity'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', path: '/activity' },
    { id: 'collections', label: t('nav.collections'), icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', path: '/collections' },
    { id: 'events', label: t('nav.events'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'messages', label: t('nav.messages'), icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'profile', label: t('nav.profile'), icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, activePanel, isMobile } = useSelector((state) => state.ui);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);

  const isVisible = isMobile ? sidebarOpen : true;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {isMobile && (
            <motion.div
              className="fixed inset-0 bg-black/40 z-30"
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
            className="fixed top-16 left-0 bottom-0 w-[72px] z-30 glass border-r border-surface-divider flex flex-col items-center py-4 gap-1"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  } else {
                    dispatch(setActivePanel(activePanel === item.id ? null : item.id));
                  }
                  if (isMobile) dispatch(setSidebarOpen(false));
                }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 group relative
                  ${(item.path ? location.pathname === item.path : activePanel === item.id)
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-hover'
                  }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.id === 'messages' && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-primary rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
                <span className="absolute left-full ml-3 px-2 py-1 bg-elevated text-txt-primary text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                  {item.label}
                </span>
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={() => dispatch(closePanel())}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-txt-muted hover:text-txt-secondary hover:bg-surface-hover transition-all"
              title={t('common.collapse', 'Collapse')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              </svg>
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
