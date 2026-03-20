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

/* ── Inline SVG icons ─────────────────────────────────────────────────────── */
const SVG_PROPS = {
  width: '18',
  height: '18',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const PinSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PenSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);
const CalendarSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const StarSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const CheckSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const HeartSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const UsersSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const UserSvg = () => (
  <svg {...SVG_PROPS}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ── Empty-state icon components (fills the 64px EmptyState slot) ─────────── */
const ChartEmptySvg = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '100%', height: '100%' }}
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);
const ListEmptySvg = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '100%', height: '100%' }}
  >
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

/* ── Stat card config ─────────────────────────────────────────────────────── */
const STAT_CONFIG = [
  { key: 'pinsCreated',    label: 'Pins',        icon: <PinSvg />,      color: 'text-accent-danger'    },
  { key: 'postsCreated',   label: 'Posts',        icon: <PenSvg />,      color: 'text-accent-primary'   },
  { key: 'eventsCreated',  label: 'Events',       icon: <CalendarSvg />, color: 'text-accent-violet'    },
  { key: 'reviewsWritten', label: 'Reviews',      icon: <StarSvg />,     color: 'text-accent-warning'   },
  { key: 'checkIns',       label: 'Check-ins',    icon: <CheckSvg />,    color: 'text-accent-success'   },
  { key: 'likesGiven',     label: 'Likes Given',  icon: <HeartSvg />,    color: 'text-pink-400'         },
  { key: 'followers',      label: 'Followers',    icon: <UsersSvg />,    color: 'text-accent-secondary' },
  { key: 'following',      label: 'Following',    icon: <UserSvg />,     color: 'text-indigo-400'       },
];

/* ── Activity type config ─────────────────────────────────────────────────── */
const TYPE_BADGE = {
  pin:   { label: 'Pin',   bg: 'bg-accent-danger/15 text-accent-danger',   icon: <PinSvg /> },
  post:  { label: 'Post',  bg: 'bg-accent-primary/15 text-accent-primary', icon: <PenSvg /> },
  event: { label: 'Event', bg: 'bg-accent-violet/15 text-accent-violet',   icon: <CalendarSvg /> },
};

/* ── Heatmap helpers ──────────────────────────────────────────────────────── */
const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getHeatmapColor(count) {
  if (count === 0) return 'bg-surface-hover';
  if (count === 1) return 'bg-accent-success/15';
  if (count <= 3) return 'bg-accent-success/40';
  if (count <= 6) return 'bg-accent-success/70';
  return 'bg-accent-success';
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
      <span className={`shrink-0 ${color}`}>{icon}</span>
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
      {/* Month labels — each span covers the exact pixel-width of its month's columns */}
      <div className="flex mb-1 ml-8" style={{ gap: 0 }}>
        {monthLabels.map((m, idx) => (
          <span
            key={`${m.label}-${m.index}`}
            className="text-[10px] text-txt-muted shrink-0"
            style={{
              width:
                idx < monthLabels.length - 1
                  ? `${(monthLabels[idx + 1].index - m.index) * 14.5}px`
                  : 'auto',
            }}
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
  const imgSrc = item.images?.[0] || item.coverImage || null;

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
        <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-txt-muted shrink-0">
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
          <span className="text-pink-400"><HeartSvg /></span>
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
            className="text-sm text-accent-violet hover:underline"
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
              icon={<ChartEmptySvg />}
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
              icon={<ListEmptySvg />}
              title="No recent activity"
              description="Your pins, posts, and events will appear here."
            />
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
