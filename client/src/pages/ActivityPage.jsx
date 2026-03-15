import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../api/activityApi';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import LoadMoreButton from '../components/common/LoadMoreButton';

/* ─────────────────────────────────────────────────────────────────────────────
 * ActivityPage — Dashboard with stats, heatmap, and recent activity
 * ───────────────────────────────────────────────────────────────────────────── */

const pageVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Stat card icons ──────────────────────────────────────────────────────── */
const STAT_CONFIG = [
  { key: 'pinsCreated', label: 'Pins', icon: '📍', color: 'text-red-400' },
  { key: 'postsCreated', label: 'Posts', icon: '✍️', color: 'text-blue-400' },
  { key: 'eventsCreated', label: 'Events', icon: '🎉', color: 'text-purple-400' },
  { key: 'reviewsWritten', label: 'Reviews', icon: '⭐', color: 'text-yellow-400' },
  { key: 'checkIns', label: 'Check-ins', icon: '📌', color: 'text-green-400' },
  { key: 'likesGiven', label: 'Likes Given', icon: '❤️', color: 'text-pink-400' },
  { key: 'followers', label: 'Followers', icon: '👥', color: 'text-cyan-400' },
  { key: 'following', label: 'Following', icon: '👤', color: 'text-indigo-400' },
];

/* ── Activity type config ─────────────────────────────────────────────────── */
const TYPE_BADGE = {
  pin: { label: 'Pin', bg: 'bg-red-500/15 text-red-400', icon: '📍' },
  post: { label: 'Post', bg: 'bg-blue-500/15 text-blue-400', icon: '✍️' },
  event: { label: 'Event', bg: 'bg-purple-500/15 text-purple-400', icon: '🎉' },
};

/* ── Heatmap helpers ──────────────────────────────────────────────────────── */
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getHeatmapColor(count) {
  if (count === 0) return 'bg-surface-hover';
  if (count === 1) return 'bg-green-900/60';
  if (count <= 3) return 'bg-green-700/70';
  if (count <= 6) return 'bg-green-500/80';
  return 'bg-green-400';
}

function buildHeatmapGrid(heatmapData) {
  const map = {};
  for (const { date, count } of heatmapData) {
    map[date] = count;
  }

  const weeks = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364); // Go back ~52 weeks
  // Align to Monday
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - ((dayOfWeek + 6) % 7));

  let currentWeek = [];
  const d = new Date(start);
  while (d <= today) {
    const dateStr = d.toISOString().slice(0, 10);
    currentWeek.push({ date: dateStr, count: map[dateStr] || 0 });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const firstDay = new Date(weeks[i][0].date);
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      labels.push({ index: i, label: MONTHS[month] });
      lastMonth = month;
    }
  }
  return labels;
}

/* ── Components ───────────────────────────────────────────────────────────── */

const StatCard = memo(function StatCard({ icon, label, value, color }) {
  return (
    <motion.div
      variants={cardVariants}
      className="glass rounded-xl p-4 flex items-center gap-3 border border-surface-divider"
    >
      <span className={`text-2xl ${color}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-txt-primary leading-tight">
          {value?.toLocaleString() ?? '—'}
        </p>
        <p className="text-xs text-txt-muted truncate">{label}</p>
      </div>
    </motion.div>
  );
});

function ActivityHeatmap({ heatmapData }) {
  const weeks = useMemo(() => buildHeatmapGrid(heatmapData), [heatmapData]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  return (
    <div className="glass rounded-xl p-4 border border-surface-divider overflow-x-auto">
      {/* Month labels */}
      <div className="flex mb-1 ml-8">
        {monthLabels.map((m) => (
          <span
            key={`${m.label}-${m.index}`}
            className="text-[10px] text-txt-muted"
            style={{ position: 'relative', left: `${m.index * 14}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 shrink-0">
          {DAYS.map((d, i) => (
            <div key={i} className="w-6 h-[12px] flex items-center justify-end pr-1">
              <span className="text-[9px] text-txt-muted">{d}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-[12px] h-[12px] rounded-[2px] ${getHeatmapColor(day.count)} transition-colors`}
                title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-txt-muted mr-1">Less</span>
        {[0, 1, 2, 4, 7].map((c) => (
          <div
            key={c}
            className={`w-[12px] h-[12px] rounded-[2px] ${getHeatmapColor(c)}`}
          />
        ))}
        <span className="text-[10px] text-txt-muted ml-1">More</span>
      </div>
    </div>
  );
}

const ActivityItem = memo(function ActivityItem({ item }) {
  const badge = TYPE_BADGE[item.type] || TYPE_BADGE.pin;
  const title = item.title || item.text?.slice(0, 80) || 'Untitled';
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const imgSrc =
    item.images?.[0] || item.coverImage || null;

  return (
    <motion.div
      variants={cardVariants}
      className="glass rounded-xl p-3 border border-surface-divider flex items-center gap-3 hover:bg-surface-hover/40 transition-colors"
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-xl shrink-0">
          {badge.icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-txt-primary truncate font-medium">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg}`}>
            {badge.label}
          </span>
          <span className="text-[11px] text-txt-muted">{date}</span>
        </div>
      </div>
      {item.likes && (
        <div className="text-xs text-txt-muted flex items-center gap-1 shrink-0">
          <span>❤️</span>
          <span>{item.likes.length}</span>
        </div>
      )}
    </motion.div>
  );
});

function LoadingGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

export default function ActivityPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    activityApi
      .getStats()
      .then((res) => setStats(res.data?.stats || res.data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    activityApi
      .getActivityHeatmap()
      .then((res) => setHeatmap(res.data?.heatmap || []))
      .catch(() => setHeatmap([]))
      .finally(() => setLoadingHeatmap(false));

    activityApi
      .getRecentActivity({ limit: 20 })
      .then((res) => {
        const data = res.data?.activities || [];
        setActivities(data);
        setHasMoreActivities(data.length === 20);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoadingActivities(false));
  }, []);

  const memberDays = stats?.daysSinceJoined ?? 0;
  const joinDate = stats?.joinDate
    ? new Date(stats.joinDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const handleLoadMoreActivities = useCallback(() => {
    const nextPage = activityPage + 1;
    setLoadingMore(true);
    activityApi
      .getRecentActivity({ page: nextPage, limit: 20 })
      .then((res) => {
        const data = res.data?.activities || [];
        setActivities((prev) => [...prev, ...data]);
        setActivityPage(nextPage);
        setHasMoreActivities(data.length === 20);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [activityPage]);

  return (
    <motion.div
      className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary">Activity</h1>
            <p className="text-sm text-txt-muted mt-1">
              {user?.name ? `${user.name}'s` : 'Your'} dashboard
              {joinDate && <span className="ml-1">· Member since {joinDate}</span>}
              {memberDays > 0 && <span className="ml-1">({memberDays} days)</span>}
            </p>
          </div>
          <button
            onClick={() => navigate(`/profile/${user?._id || ''}`)}
            className="text-sm text-accent-primary hover:underline"
          >
            View Profile
          </button>
        </motion.div>

        {/* ── Stats grid ───────────────────────────────────────────────────── */}
        <motion.section variants={sectionVariants}>
          <h2 className="text-lg font-semibold text-txt-primary mb-3">Overview</h2>
          {loadingStats ? (
            <LoadingGrid count={8} />
          ) : stats ? (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
            >
              {STAT_CONFIG.map((s) => (
                <StatCard
                  key={s.key}
                  icon={s.icon}
                  label={s.label}
                  value={stats[s.key]}
                  color={s.color}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon="📊"
              title="No stats available"
              description="Start creating content to see your activity stats."
            />
          )}
        </motion.section>

        {/* ── Contribution heatmap ─────────────────────────────────────────── */}
        <motion.section variants={sectionVariants}>
          <h2 className="text-lg font-semibold text-txt-primary mb-3">
            Contributions
          </h2>
          {loadingHeatmap ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : heatmap.length > 0 ? (
            <ActivityHeatmap heatmapData={heatmap} />
          ) : (
            <div className="glass rounded-xl p-4 border border-surface-divider">
              <ActivityHeatmap heatmapData={[]} />
              <p className="text-center text-xs text-txt-muted mt-2">
                No contributions yet. Create pins, posts, or events to fill your heatmap!
              </p>
            </div>
          )}
        </motion.section>

        {/* ── Recent activity timeline ─────────────────────────────────────── */}
        <motion.section variants={sectionVariants}>
          <h2 className="text-lg font-semibold text-txt-primary mb-3">Recent Activity</h2>
          {loadingActivities ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : activities.length > 0 ? (
            <>
              <motion.div
                className="space-y-2"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
              >
                {activities.map((item) => (
                  <ActivityItem key={item._id} item={item} />
                ))}
              </motion.div>
              <div className="mt-3">
                <LoadMoreButton
                  onClick={handleLoadMoreActivities}
                  loading={loadingMore}
                  hasMore={hasMoreActivities}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon="📋"
              title="No recent activity"
              description="Your pins, posts, and events will appear here."
            />
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
