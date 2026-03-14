/**
 * NotificationPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Sliding side panel for user notifications.
 * Renders only when state.ui.activePanel === 'notifications'.
 *
 * Layout
 *   • Spring slide-in from left, positioned at left-[72px] (after sidebar)
 *   • Width 380 px, full viewport height below header (top-16 → bottom-0)
 *   • Glass morphism: backdrop-blur-xl, rgba(15,21,32,0.72), blue-tinted border
 *
 * Features
 *   • Fetches notifications on mount
 *   • "Mark all read" button (marks every unread item)
 *   • Per-type icon + colour accent (follow/like/comment/event/review/message)
 *   • Unread blue dot indicator per item
 *   • Click → markAsRead + navigate to related content
 *   • Time ago via date-fns formatDistanceToNow
 *   • Loading skeleton (6 items) + empty state
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../../features/notifications/notificationSlice';
import { closePanel } from '../../features/ui/uiSlice';
import { formatDistanceToNow } from 'date-fns';
import { PanelSkeleton, EmptyState } from '../ui';

// ─── Spring ───────────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 };

// ─── Notification type config ─────────────────────────────────────────────────

const TYPE_CONFIG = {
  follow: {
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  like: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
  comment: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  event: {
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  review: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  message: {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.10)',
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.comment;
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const BellIcon = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const CheckAllIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12" />
    <polyline points="15 6 9 12" />
  </svg>
);

// ─── Notification item ────────────────────────────────────────────────────────

function NotificationItem({ notification, onRead, onDelete }) {
  const { _id, type = 'comment', message, actor, read, createdAt, targetType, targetId } = notification;
  const { color, bg, Icon } = getTypeConfig(type);

  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : '';

  // Build display text: prefer explicit message, fall back to type-based default
  const displayText = message || buildFallbackText(type, actor);

  function buildFallbackText(t, a) {
    const name = a?.displayName || a?.username || 'Someone';
    switch (t) {
      case 'follow':  return `${name} started following you`;
      case 'like':    return `${name} liked your pin`;
      case 'comment': return `${name} commented on your post`;
      case 'event':   return `${name} invited you to an event`;
      case 'review':  return `${name} left you a review`;
      case 'message': return `${name} sent you a message`;
      default:        return `${name} interacted with your content`;
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ scale: 1.012, x: 2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onRead(_id, targetType, targetId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onRead(_id, targetType, targetId)}
      className={[
        'group w-full flex items-start gap-3 p-3.5 rounded-xl text-left',
        'border transition-all duration-200 cursor-pointer',
        read
          ? 'border-[var(--glass-border)] bg-surface-hover hover:bg-surface-active'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active hover:border-[var(--glass-border)]',
      ].join(' ')}
    >
      {/* Type icon bubble */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: bg, color }}
      >
        <Icon />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-[13px] leading-snug font-body',
            read ? 'text-txt-secondary' : 'text-txt-primary font-medium',
          ].join(' ')}
        >
          {displayText}
        </p>
        {timeAgo && (
          <p className="text-[11px] text-txt-muted mt-1 font-body">{timeAgo}</p>
        )}
      </div>

      {/* Unread dot + per-item delete button (shown on hover) */}
      <div className="flex-shrink-0 mt-1.5 relative flex items-center justify-center w-5 h-5">
        {!read && (
          <span
            className="w-2 h-2 rounded-full block group-hover:opacity-0 transition-opacity duration-150"
            style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.6)' }}
          />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(_id); }}
          aria-label="Delete notification"
          className="absolute inset-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-txt-muted hover:text-accent-danger transition-all duration-150"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

export default function NotificationPanel() {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((s) => s.notifications);
  const { activePanel, isMobile }       = useSelector((s) => s.ui);

  const isOpen = activePanel === 'notifications';

  // Fetch on open
  useEffect(() => {
    if (isOpen) dispatch(fetchNotifications());
  }, [isOpen, dispatch]);

  // Mark one as read and optionally navigate
  const handleRead = useCallback(
    (_id, targetType, targetId) => {
      dispatch(markAsRead(_id));
      // Navigation: callers can extend this switch for deep-linking
      // e.g. if targetType === 'post' → navigate to post page
    },
    [dispatch],
  );

  // Mark all unread notifications as read
  const handleMarkAllRead = useCallback(
    () => dispatch(markAllAsRead()),
    [dispatch],
  );

  // Delete a single notification
  const handleDelete = useCallback(
    (_id) => dispatch(deleteNotification(_id)),
    [dispatch],
  );

  const handleClose = useCallback(() => dispatch(closePanel()), [dispatch]);

  // ── Responsive layout ─────────────────────────────────────────────────────

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col overflow-hidden glass'
    : 'fixed top-16 bottom-0 left-[72px] w-[380px] z-30 flex flex-col overflow-hidden glass border-r border-[var(--glass-border)]';

  const motionProps = isMobile
    ? {
        initial:    { opacity: 0, y: 24 },
        animate:    { opacity: 1, y: 0  },
        exit:       { opacity: 0, y: 24 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial:    { x: -380 },
        animate:    { x: 0    },
        exit:       { x: -380 },
        transition: SPRING,
      };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="notification-panel"
          role="complementary"
          aria-label="Notifications"
          {...motionProps}
          className={panelClass}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-surface-divider">
            <div className="flex items-center justify-between">
              {/* Title + unread badge */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent-primary/15 flex items-center justify-center text-accent-primary">
                  <BellIcon className="w-4 h-4" />
                </div>
                <h2 className="text-[15px] font-bold text-txt-primary font-heading tracking-tight">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full
                               bg-accent-primary text-[10px] font-bold text-white px-1.5"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </motion.span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                               font-medium text-accent-primary hover:bg-accent-primary/10
                               transition-colors duration-150 font-body"
                    aria-label="Mark all as read"
                  >
                    <CheckAllIcon />
                    Mark all read
                  </motion.button>
                )}
                {items.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => dispatch(clearAllNotifications())}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                               font-medium text-accent-danger hover:bg-accent-danger/10
                               transition-colors duration-150 font-body"
                    aria-label="Clear all notifications"
                  >
                    Clear all
                  </motion.button>
                )}
                <button
                  onClick={handleClose}
                  aria-label="Close notifications"
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                   text-txt-muted hover:text-txt-primary hover:bg-surface-hover
                   transition-all duration-150"
                >
                  <XIcon />
                </button>
              </div>
            </div>
          </div>

          {/* ── Scrollable list ───────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto px-3 pt-3 pb-6 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
          >
            {/* Loading skeletons */}
            {loading && items.length === 0 && <PanelSkeleton />}

            {/* Empty state */}
            {!loading && items.length === 0 && (
              <EmptyState
                icon="notifications"
                title="No notifications"
                description="You're all caught up! Check back later for updates"
              />
            )}

            {/* Notification list */}
            {items.length > 0 && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div className="space-y-1.5">
                  {items.map((notification, i) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, scale: 0.96 }}
                      transition={{
                        delay: i < 8 ? i * 0.04 : 0,
                        duration: 0.2,
                        ease: 'easeOut',
                      }}
                    >
                      <NotificationItem
                        notification={notification}
                        onRead={handleRead}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Section divider for read/unread if mixed */}
            {!loading && items.length > 0 && items.every((n) => n.read) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-txt-muted text-[11px] font-body text-center pt-5"
              >
                You're all caught up ✓
              </motion.p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
