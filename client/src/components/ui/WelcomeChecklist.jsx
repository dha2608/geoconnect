import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_DISMISSED    = 'geoconnect_checklist_dismissed';
const LS_LIKED_PIN    = 'geoconnect_liked_pin';
const LS_SENT_MSG     = 'geoconnect_sent_message';
const LS_CHECKED_IN   = 'geoconnect_checked_in';
const LS_CREATED_PIN  = 'geoconnect_created_pin';

// ─── Check icon ──────────────────────────────────────────────────────────────
function CheckIcon({ done }) {
  return (
    <motion.div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
        done
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-surface-divider bg-transparent'
      }`}
      animate={done ? { scale: [1, 1.25, 1] } : {}}
      transition={{ type: 'spring', damping: 12 }}
    >
      {done && (
        <motion.svg
          viewBox="0 0 12 10"
          className="w-3 h-3 text-white"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <motion.path
            d="M1 5l3.5 3.5L11 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.svg>
      )}
    </motion.div>
  );
}

// ─── Individual checklist item ────────────────────────────────────────────────
function ChecklistItem({ icon, label, done, actionLabel, onAction }) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 py-2.5 px-1 rounded-lg transition-colors duration-200 ${
        done ? 'opacity-60' : 'hover:bg-white/5'
      }`}
    >
      <CheckIcon done={done} />
      <span className="text-lg leading-none select-none">{icon}</span>
      <span
        className={`flex-1 text-sm font-medium transition-colors duration-300 ${
          done ? 'line-through text-txt-muted' : 'text-txt-primary'
        }`}
      >
        {label}
      </span>
      {!done && actionLabel && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-accent-primary hover:opacity-80 transition-opacity duration-150 whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-accent-primary"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      />
    </div>
  );
}

// ─── FAB trigger button ───────────────────────────────────────────────────────
function FabButton({ completedCount, total, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-12 h-12 rounded-full bg-accent-primary shadow-lg flex items-center justify-center relative"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      title="Open getting-started checklist"
    >
      {/* Progress ring */}
      <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
        <motion.circle
          cx="24"
          cy="24"
          r="20"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={125.66}
          initial={{ strokeDashoffset: 125.66 }}
          animate={{ strokeDashoffset: 125.66 * (1 - completedCount / total) }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
        />
      </svg>
      <span className="relative z-10 text-xs font-bold text-white leading-none">
        {completedCount}/{total}
      </span>
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WelcomeChecklist() {
  const { user } = useSelector((state) => state.auth);

  const [expanded, setExpanded]     = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [lsFlags, setLsFlags]       = useState({
    likedPin:   false,
    sentMsg:    false,
    checkedIn:  false,
    createdPin: false,
  });

  // Read localStorage flags on mount
  useEffect(() => {
    setLsFlags({
      likedPin:   !!localStorage.getItem(LS_LIKED_PIN),
      sentMsg:    !!localStorage.getItem(LS_SENT_MSG),
      checkedIn:  !!localStorage.getItem(LS_CHECKED_IN),
      createdPin: !!localStorage.getItem(LS_CREATED_PIN),
    });
    setDismissed(!!localStorage.getItem(LS_DISMISSED));
  }, []);

  // Build checklist items (memoised so re-renders are cheap)
  const items = useMemo(() => [
    {
      id: 'profile',
      icon: '👤',
      label: 'Complete your profile',
      done: !!(user?.avatar && user?.bio),
      actionLabel: 'Go to profile',
      onAction: null, // handled below via generic nav
    },
    {
      id: 'pin',
      icon: '📍',
      label: 'Create your first pin',
      done: lsFlags.createdPin,
      actionLabel: 'Create pin',
      onAction: null,
    },
    {
      id: 'follow',
      icon: '🤝',
      label: 'Follow someone',
      done: Array.isArray(user?.following) && user.following.length > 0,
      actionLabel: 'Explore people',
      onAction: null,
    },
    {
      id: 'like',
      icon: '❤️',
      label: 'Like a pin',
      done: lsFlags.likedPin,
      actionLabel: 'Browse the feed',
      onAction: null,
    },
    {
      id: 'message',
      icon: '💬',
      label: 'Send a message',
      done: lsFlags.sentMsg,
      actionLabel: 'Open messages',
      onAction: null,
    },
    {
      id: 'checkin',
      icon: '📡',
      label: 'Check in at a location',
      done: lsFlags.checkedIn,
      actionLabel: 'Check in',
      onAction: null,
    },
  ], [user, lsFlags]);

  const completedCount = useMemo(() => items.filter((i) => i.done).length, [items]);
  const allDone        = completedCount === items.length;
  const progress       = Math.round((completedCount / items.length) * 100);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(LS_DISMISSED, 'true');
    setDismissed(true);
  }, []);

  // Don't render if dismissed, all done, or user not loaded
  if (dismissed || allDone || !user?._id) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[150] flex flex-col items-end gap-3 md:bottom-6">
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="checklist-card"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="w-72 glass rounded-xl border border-surface-divider shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-txt-primary">Getting started</span>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-txt-muted hover:text-txt-primary transition-colors duration-150"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-txt-muted mb-3">
                {completedCount} of {items.length} tasks complete
              </p>
              <ProgressBar value={progress} />
            </div>

            {/* Divider */}
            <div className="border-t border-surface-divider" />

            {/* Items */}
            <div className="px-3 py-2">
              {items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  done={item.done}
                  actionLabel={item.actionLabel}
                  onAction={item.onAction}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-surface-divider">
              <p className="text-xs text-txt-muted text-center">
                ✨ Complete all tasks to unlock your Explorer badge!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <FabButton
        completedCount={completedCount}
        total={items.length}
        onClick={() => setExpanded((v) => !v)}
      />
    </div>
  );
}
