import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchLeaderboard,
  fetchMyProgress,
  fetchAllAchievements,
  selectLeaderboard,
  selectMyRank,
  selectProgress,
  selectEarnedAchievements,
} from '../features/gamification/gamificationSlice';
import LevelProgressBar from '../components/gamification/LevelProgressBar';
import AchievementCard from '../components/gamification/AchievementCard';
import DailyChallenges from '../components/gamification/DailyChallenges';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

/* ── Animation variants ─────────────────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Constants ───────────────────────────────────────────────── */
const PERIODS = [
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'alltime', label: 'All Time' },
];

const SCOPES = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
];

/* ── Medal colors for top 3 ──────────────────────────────────── */
const medalColors = {
  1: 'from-amber-400 to-yellow-500 text-amber-900',
  2: 'from-txt-secondary to-txt-muted text-txt-primary',
  3: 'from-amber-600 to-amber-700 text-amber-100',
};

/* ── LeaderboardRow ──────────────────────────────────────────── */
function LeaderboardRow({ entry, rank, isCurrentUser }) {
  const medal = medalColors[rank];

  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isCurrentUser
          ? 'bg-accent-primary/10 border border-accent-primary/20'
          : 'hover:bg-surface-hover'
      }`}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {medal ? (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br ${medal} text-xs font-bold`}
          >
            {rank}
          </span>
        ) : (
          <span className="text-sm text-txt-muted font-medium tabular-nums">
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-hover shrink-0">
        {entry.userInfo?.avatar ? (
          <img
            src={entry.userInfo.avatar}
            alt={entry.userInfo.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-txt-muted">
            {entry.userInfo?.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Name + level */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-txt-primary truncate">
          {entry.userInfo?.name}
          {isCurrentUser && (
            <span className="text-[10px] text-accent-primary ml-1.5">(You)</span>
          )}
        </p>
        <p className="text-xs text-txt-muted">
          Lv.{entry.level} · {entry.levelTitle}
        </p>
      </div>

      {/* XP */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-txt-primary tabular-nums">
          {entry.xp?.toLocaleString()}
        </p>
        <p className="text-[10px] text-txt-muted">XP</p>
      </div>
    </motion.div>
  );
}

/* ── Tab Pill ────────────────────────────────────────────────── */
function TabPill({ options, value, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-surface-hover/60">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            value === opt.key
              ? 'text-txt-primary'
              : 'text-txt-muted hover:text-txt-secondary'
          }`}
        >
          {value === opt.key && (
            <motion.div
              layoutId="tab-bg"
              className="absolute inset-0 rounded-lg glass"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function LeaderboardPage() {
  const dispatch = useDispatch();
  const leaderboard = useSelector(selectLeaderboard);
  const myRank = useSelector(selectMyRank);
  const progress = useSelector(selectProgress);
  const earnedAchievements = useSelector(selectEarnedAchievements);
  const [period, setPeriod] = useState('weekly');
  const [scope, setScope] = useState('global');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      dispatch(fetchLeaderboard({ period, scope, limit: 50 })).unwrap(),
      dispatch(fetchMyProgress()).unwrap(),
      dispatch(fetchAllAchievements()).unwrap(),
    ]).finally(() => setLoading(false));
  }, [dispatch, period, scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <motion.div
      className="max-w-5xl mx-auto px-4 py-6 h-full overflow-y-auto sidebar-scroll"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Leaderboard</h1>
        <p className="text-sm text-txt-secondary mt-1">
          Compete with the community and earn your place
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ─── Left: Leaderboard ─────────────────────────────── */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <TabPill options={PERIODS} value={period} onChange={setPeriod} />
            <TabPill options={SCOPES} value={scope} onChange={setScope} />
          </div>

          {/* My rank card */}
          {myRank && !loading && (
            <div className="glass p-3 flex items-center gap-3">
              <span className="text-xs text-txt-muted">Your Rank</span>
              <span className="text-lg font-bold text-accent-primary tabular-nums">
                #{myRank}
              </span>
              <span className="text-xs text-txt-muted">of {leaderboard?.length || 0}</span>
            </div>
          )}

          {/* Leaderboard list */}
          <div className="glass p-2 space-y-1">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton variant="avatar" size={28} />
                    <Skeleton variant="avatar" size={36} />
                    <div className="flex-1">
                      <Skeleton width="60%" height={14} />
                      <Skeleton width="30%" height={10} className="mt-1" />
                    </div>
                    <Skeleton width={50} height={14} />
                  </div>
                ))}
              </div>
            ) : leaderboard?.length > 0 ? (
              <motion.div variants={pageVariants} initial="hidden" animate="visible">
                {leaderboard.map((entry, idx) => (
                  <LeaderboardRow
                    key={entry.user?._id || idx}
                    entry={entry}
                    rank={idx + 1}
                    isCurrentUser={entry.isCurrentUser}
                  />
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon="users"
                title="No rankings yet"
                description="Be the first to earn XP and claim your spot!"
              />
            )}
          </div>
        </motion.div>

        {/* ─── Right: Sidebar ─────────────────────────────── */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Level progress */}
          <LevelProgressBar />

          {/* Daily challenges */}
          <DailyChallenges />

          {/* Recent achievements */}
          <div className="glass p-4">
            <h3 className="text-sm font-semibold text-txt-primary mb-3 flex items-center gap-2">
              <span>🏆</span> Recent Achievements
            </h3>
            {earnedAchievements?.length > 0 ? (
              <div className="space-y-2">
                {earnedAchievements.slice(0, 5).map((a) => (
                  <AchievementCard
                    key={a.achievement?._id || a._id}
                    achievement={a.achievement || a}
                    earned
                    earnedAt={a.earnedAt}
                    compact
                  />
                ))}
                {earnedAchievements.length > 5 && (
                  <p className="text-[10px] text-txt-muted text-center pt-1">
                    +{earnedAchievements.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-txt-muted text-center py-4">
                No achievements earned yet. Keep exploring!
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
