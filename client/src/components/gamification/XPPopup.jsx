import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectXPPopups,
  dismissXPPopup,
} from '../../features/gamification/gamificationSlice';

const actionLabels = {
  PIN_CREATE: 'Pin Created',
  POST_CREATE: 'New Post',
  CHECK_IN: 'Check-in',
  LIKE_RECEIVED: 'Like Received',
  COMMENT_RECEIVED: 'Comment Received',
  REVIEW_CREATE: 'Review Written',
  FOLLOW_GAINED: 'New Follower',
  DAILY_LOGIN: 'Daily Login',
  EVENT_ATTEND: 'Event RSVP',
  DAILY_CHALLENGE: 'Challenge Done',
  ACHIEVEMENT: 'Achievement Unlocked',
};

const actionIcons = {
  PIN_CREATE: '📍',
  POST_CREATE: '📝',
  CHECK_IN: '📌',
  LIKE_RECEIVED: '❤️',
  COMMENT_RECEIVED: '💬',
  REVIEW_CREATE: '⭐',
  FOLLOW_GAINED: '👤',
  DAILY_LOGIN: '🔥',
  EVENT_ATTEND: '🎉',
  DAILY_CHALLENGE: '✅',
  ACHIEVEMENT: '🏆',
};

function XPToast({ popup, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(popup.id), 3000);
    return () => clearTimeout(timer);
  }, [popup.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass flex items-center gap-3 px-4 py-2.5 shadow-lg shadow-accent-primary/10 cursor-pointer"
      onClick={() => onDismiss(popup.id)}
    >
      <span className="text-lg leading-none" role="img" aria-hidden>
        {actionIcons[popup.action] || '✨'}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-[var(--text-secondary)] leading-tight">
          {actionLabels[popup.action] || popup.action}
        </p>
        <p className="text-sm font-bold text-accent-primary leading-tight">
          +{popup.amount} XP
        </p>
      </div>

      {/* Animated plus sign */}
      <motion.span
        className="text-accent-primary font-bold text-lg ml-auto"
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
      >
        +
      </motion.span>
    </motion.div>
  );
}

export default function XPPopup() {
  const dispatch = useDispatch();
  const popups = useSelector(selectXPPopups);

  const handleDismiss = (id) => dispatch(dismissXPPopup(id));

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs w-full">
      <AnimatePresence mode="popLayout">
        {popups.map((popup) => (
          <div key={popup.id} className="pointer-events-auto">
            <XPToast popup={popup} onDismiss={handleDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
