import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearLatestNotification } from '../../features/notifications/notificationSlice';

const NOTIF_ICONS = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  checkin: '📌',
  event_reminder: '⏰',
  message: '✉️',
  mention: '📢',
  default: '🔔',
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

let toastIdCounter = 0;

function getNavigationTarget(notification) {
  const { type, data } = notification;
  if (type === 'message') return '/messages';
  if (type === 'follow') return `/profile/${data?.fromUser?._id || data?.fromUserId}`;
  if (data?.pinId) return `/pins/${data.pinId}`;
  if (data?.postId) return `/posts/${data.postId}`;
  if (data?.eventId) return `/events/${data.eventId}`;
  return null;
}

function ToastItem({ toast, onDismiss }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const icon = NOTIF_ICONS[toast.type] ?? NOTIF_ICONS.default;

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  const handleClick = useCallback(() => {
    const target = getNavigationTarget(toast);
    if (target) navigate(target);
    onDismiss(toast.id);
  }, [toast, navigate, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 120, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
      onClick={handleClick}
      className="glass rounded-xl border border-surface-divider shadow-lg cursor-pointer
                 flex items-start gap-3 p-3 w-80 hover:border-accent-violet/40
                 transition-colors duration-150 select-none"
      role="alert"
      aria-live="polite"
    >
      {/* Avatar / Emoji */}
      <div className="flex-shrink-0 mt-0.5">
        {toast.senderAvatar ? (
          <img
            src={toast.senderAvatar}
            alt={toast.senderName ?? 'User'}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-surface-divider"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center text-lg leading-none">
            {icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-txt-primary font-medium leading-snug line-clamp-2">
          {toast.message}
        </p>
        <p className="text-[11px] text-txt-muted mt-0.5">
          {new Date(toast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="flex-shrink-0 p-0.5 rounded-md text-txt-muted hover:text-txt-primary
                   hover:bg-surface-hover transition-colors"
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500/50 to-violet-500/50 rounded-b-xl"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export default function NotificationToast() {
  const dispatch = useDispatch();
  const latestNotification = useSelector((state) => state.notifications.latestNotification);
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!latestNotification) return;

    const newToast = { ...latestNotification, id: ++toastIdCounter };

    setToasts((prev) => {
      const next = [newToast, ...prev];
      // Enforce MAX_TOASTS — drop oldest (last element)
      return next.slice(0, MAX_TOASTS);
    });

    // Clear from Redux so the same notification doesn't re-trigger
    dispatch(clearLatestNotification());
  }, [latestNotification, dispatch]);

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto relative overflow-hidden">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
