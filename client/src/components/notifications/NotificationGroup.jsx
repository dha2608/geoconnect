import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Returns a human-readable relative time string */
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Build a group key from notification type + target resource */
function groupKey(n) {
  const target = n.data?.pinId || n.data?.postId || n.data?.eventId || 'global';
  return `${n.type}::${target}`;
}

/** Format actors list: "Alice, Bob and 3 others" */
function formatActors(notifications) {
  const names = notifications
    .map((n) => n.data?.fromUser?.name || n.senderName || 'Someone')
    .filter(Boolean);

  const unique = [...new Set(names)];
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  const rest = unique.length - 2;
  return `${unique[0]}, ${unique[1]} and ${rest} other${rest === 1 ? '' : 's'}`;
}

/** Verb for the notification type in grouped context */
function groupVerb(type) {
  switch (type) {
    case 'like':    return 'liked your pin';
    case 'comment': return 'commented on your post';
    case 'follow':  return 'started following you';
    case 'checkin': return 'checked in nearby';
    case 'mention': return 'mentioned you';
    default:        return 'sent you a notification';
  }
}

const TYPE_ICONS = {
  like: '❤️', comment: '💬', follow: '👤',
  checkin: '📌', mention: '📢', default: '🔔',
};

/** Single notification row */
function SingleRow({ notification }) {
  const icon = TYPE_ICONS[notification.type] ?? TYPE_ICONS.default;
  const sender = notification.data?.fromUser;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 mt-0.5">
        {sender?.avatar ? (
          <img src={sender.avatar} alt={sender.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-base">
            {icon}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-txt-primary leading-snug">
          <span className="font-semibold">{sender?.name ?? 'Someone'}</span>{' '}
          {notification.message?.replace(sender?.name ?? '', '').trim() || groupVerb(notification.type)}
        </p>
        <p className="text-[11px] text-txt-muted mt-0.5">{relativeTime(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-accent-primary mt-1.5" />
      )}
    </div>
  );
}

/** Grouped notification row (2+ similar notifications) */
function GroupedRow({ group }) {
  const [expanded, setExpanded] = useState(false);
  const latest = group[0];
  const icon = TYPE_ICONS[latest.type] ?? TYPE_ICONS.default;
  const hasUnread = group.some((n) => !n.read);

  // Collect avatar stack (up to 3)
  const avatars = group
    .map((n) => n.data?.fromUser)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="py-2">
      {/* Group header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left group"
        aria-expanded={expanded}
      >
        {/* Avatar stack */}
        <div className="flex-shrink-0 relative w-8 h-8 mt-0.5">
          {avatars.length > 0 ? (
            avatars.map((u, i) => (
              <img
                key={u?._id ?? i}
                src={u?.avatar}
                alt={u?.name}
                className="absolute w-6 h-6 rounded-full object-cover ring-1 ring-surface-divider"
                style={{ left: i * 6, top: i * 0, zIndex: avatars.length - i }}
              />
            ))
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-base">
              {icon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-txt-primary leading-snug">
            <span className="font-semibold">{formatActors(group)}</span>{' '}
            <span className="text-txt-secondary">{groupVerb(latest.type)}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-txt-muted">{relativeTime(latest.createdAt)}</p>
            <span className="text-[10px] text-accent-primary">
              {expanded ? '▲ collapse' : `▼ ${group.length} notifications`}
            </span>
          </div>
        </div>

        {hasUnread && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-accent-primary mt-1.5" />
        )}
      </button>

      {/* Expanded individual rows */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-11 mt-1 border-l-2 border-surface-divider pl-3 flex flex-col gap-0">
              {group.map((n) => (
                <SingleRow key={n._id} notification={n} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * NotificationGroup
 * Props: { notifications: Notification[] }
 * Groups by type + target resource, renders grouped rows with expand/collapse.
 */
export default function NotificationGroup({ notifications = [] }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const n of notifications) {
      const key = groupKey(n);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    // Sort each group: newest first
    for (const [k, arr] of map) {
      map.set(k, arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
    // Return groups sorted by most-recent notification overall
    return [...map.values()].sort(
      (a, b) => new Date(b[0].createdAt) - new Date(a[0].createdAt)
    );
  }, [notifications]);

  if (groups.length === 0) {
    return (
      <p className="text-center text-txt-muted text-sm py-8">No notifications yet</p>
    );
  }

  return (
    <div className="divide-y divide-surface-divider px-1">
      {groups.map((group) =>
        group.length === 1 ? (
          <SingleRow key={group[0]._id} notification={group[0]} />
        ) : (
          <GroupedRow key={groupKey(group[0])} group={group} />
        )
      )}
    </div>
  );
}
