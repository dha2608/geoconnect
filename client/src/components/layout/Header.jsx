import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, setActivePanel } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';
import LiveIndicator from '../ui/LiveIndicator';

export default function Header() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const { unreadCount: unreadMessages } = useSelector((state) => state.messages);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 h-16 glass border-b border-surface-divider flex items-center justify-between px-4 lg:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-xl hover:bg-surface-hover text-txt-secondary hover:text-txt-primary transition-colors lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
          GeoConnect
        </h1>
        <LiveIndicator className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => dispatch(setActivePanel('search'))}
          className="p-2.5 rounded-xl hover:bg-surface-hover text-txt-secondary hover:text-txt-primary transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Notifications */}
        <button
          onClick={() => dispatch(setActivePanel('notifications'))}
          className="relative p-2.5 rounded-xl hover:bg-surface-hover text-txt-secondary hover:text-txt-primary transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-danger rounded-full text-[10px] font-bold flex items-center justify-center text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Messages */}
        <button
          onClick={() => dispatch(setActivePanel('messages'))}
          className="relative p-2.5 rounded-xl hover:bg-surface-hover text-txt-secondary hover:text-txt-primary transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-primary rounded-full text-[10px] font-bold flex items-center justify-center text-white">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => dispatch(setActivePanel('profile'))}
          className="ml-1"
        >
          <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" online />
        </button>
      </div>
    </motion.header>
  );
}
