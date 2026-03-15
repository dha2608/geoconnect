import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Icons (inline SVG — no library needed) ───────────────────────────────────

const Icons = {
  Users: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Grid: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Flag: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  Ban: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  MapPin: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  FileText: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Calendar: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Star: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  MessageCircle: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  ChevronLeft: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  AlertTriangle: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  CheckCircle: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  ArrowRight: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  RefreshCw: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  BarChart2: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = memo(function Skeleton({ className }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 ${className ?? ''}`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s linear infinite',
      }}
    />
  );
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accentClass,
  bgClass,
  warning = false,
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 flex flex-col gap-3"
    >
      {/* subtle glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 ${bgClass}`} />

      <div className="flex items-start justify-between relative z-10">
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${accentClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        {warning && (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 font-medium">
            <Icons.AlertTriangle className="w-3 h-3" />
            Action needed
          </span>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-3xl font-bold text-white font-heading tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-white/60 mt-0.5 font-medium">{label}</p>
        {subtitle && (
          <p className={`text-xs mt-1.5 font-medium ${warning ? 'text-amber-400' : 'text-white/40'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
});

// ─── MiniStatCard ─────────────────────────────────────────────────────────────

const MiniStatCard = memo(function MiniStatCard({ icon: Icon, label, value, accentClass }) {
  return (
    <motion.div
      variants={cardVariants}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-3.5"
    >
      <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shrink-0 ${accentClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-white font-heading tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-white/50 mt-0.5 truncate">{label}</p>
      </div>
    </motion.div>
  );
});

// ─── QuickLinkCard ────────────────────────────────────────────────────────────

const QuickLinkCard = memo(function QuickLinkCard({
  icon: Icon,
  title,
  description,
  href,
  accentClass,
  bgClass,
  badge,
  badgeClass,
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(href)}
      className="relative overflow-hidden text-left w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 group transition-colors hover:border-white/20 hover:bg-white/[0.08]"
    >
      <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${bgClass}`} />

      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${accentClass} group-hover:border-white/20 transition-colors`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-xs text-white/50 leading-relaxed">{description}</p>

      <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${accentClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
        Go to {title}
        <Icons.ArrowRight className="w-3.5 h-3.5" />
      </div>
    </motion.button>
  );
});

// ─── BarChart ─────────────────────────────────────────────────────────────────

const BarChart = memo(function BarChart({ data, accentClass, gradientFrom, gradientTo }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-white/30 text-sm">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Show last 14 entries if more (keep bar widths readable)
  const visible = data.slice(-14);

  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {visible.map((point, i) => {
        const pct = Math.max((point.count / maxCount) * 100, 2);
        const label =
          point._id
            ? new Date(point._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : `D${i + 1}`;

        return (
          <div key={point._id ?? i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-black/80 backdrop-blur text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap border border-white/10">
                {point.count}
              </div>
            </div>

            <div className="w-full flex items-end" style={{ height: '88px' }}>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${accentClass}`}
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-[9px] text-white/30 truncate w-full text-center hidden sm:block">
              {label.split(' ')[1] ?? label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

// ─── ReportStatusBar ──────────────────────────────────────────────────────────

const ReportStatusBar = memo(function ReportStatusBar({ pending, resolved, total }) {
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Report resolution rate</span>
        <span className="text-white/70 font-medium">
          {total > 0 ? Math.round(resolvedPct) : 0}%
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
        <div
          className="h-full rounded-l-full bg-amber-400 transition-all duration-700"
          style={{ width: `${pendingPct}%` }}
        />
        <div
          className="h-full bg-emerald-400 transition-all duration-700"
          style={{ width: `${resolvedPct}%` }}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-white/50">Pending ({pending})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-white/50">Resolved ({resolved})</span>
        </div>
      </div>
    </div>
  );
});

// ─── Loading skeleton layout ──────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full ml-auto" />
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>

      {/* content breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* two cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>

      {/* chart */}
      <Skeleton className="h-52 rounded-2xl" />

      {/* quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const users = stats?.users ?? {};
  const content = stats?.content ?? {};
  const reports = stats?.reports ?? {};
  const charts = stats?.charts ?? {};

  const totalContent = (content.pins ?? 0) + (content.posts ?? 0) + (content.events ?? 0);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 max-w-sm w-full text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-rose-400/10 border border-rose-400/20 flex items-center justify-center mx-auto">
            <Icons.AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Failed to load dashboard</p>
            <p className="text-white/50 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-colors"
          >
            <Icons.RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  // ── Full render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={sectionVariants}
        className="flex items-center gap-3 mb-8"
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
          aria-label="Go back"
        >
          <Icons.ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading leading-none">
            Admin Dashboard
          </h1>
          <p className="text-white/40 text-xs mt-1">Platform overview &amp; controls</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20 shrink-0">
          <Icons.Shield className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400">Admin</span>
        </div>
      </motion.div>

      {/* ── Primary Stats Grid ─────────────────────────────────────────────── */}
      <motion.section variants={sectionVariants} className="mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Icons.Users}
            label="Total Users"
            value={users.total ?? 0}
            subtitle={users.new30d ? `+${users.new30d} new this month` : 'No new users this month'}
            accentClass="text-blue-400"
            bgClass="bg-blue-500"
          />
          <StatCard
            icon={Icons.Grid}
            label="Total Content"
            value={totalContent}
            subtitle={`${content.pins ?? 0} pins · ${content.posts ?? 0} posts · ${content.events ?? 0} events`}
            accentClass="text-emerald-400"
            bgClass="bg-emerald-500"
          />
          <StatCard
            icon={Icons.Flag}
            label="Pending Reports"
            value={reports.pending ?? 0}
            subtitle={
              (reports.pending ?? 0) > 0
                ? `${reports.pending} report${reports.pending === 1 ? '' : 's'} need review`
                : 'All reports resolved'
            }
            accentClass="text-amber-400"
            bgClass="bg-amber-500"
            warning={(reports.pending ?? 0) > 0}
          />
          <StatCard
            icon={Icons.Ban}
            label="Banned Users"
            value={users.banned ?? 0}
            subtitle={
              users.total
                ? `${((users.banned / users.total) * 100).toFixed(1)}% of total users`
                : undefined
            }
            accentClass="text-rose-400"
            bgClass="bg-rose-500"
          />
        </div>
      </motion.section>

      {/* ── Content Breakdown ──────────────────────────────────────────────── */}
      <motion.section variants={sectionVariants} className="mb-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">
          Content breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniStatCard
            icon={Icons.MapPin}
            label="Pins"
            value={content.pins ?? 0}
            accentClass="text-blue-400"
          />
          <MiniStatCard
            icon={Icons.FileText}
            label="Posts"
            value={content.posts ?? 0}
            accentClass="text-violet-400"
          />
          <MiniStatCard
            icon={Icons.Calendar}
            label="Events"
            value={content.events ?? 0}
            accentClass="text-emerald-400"
          />
          <MiniStatCard
            icon={Icons.Star}
            label="Reviews"
            value={content.reviews ?? 0}
            accentClass="text-amber-400"
          />
          <MiniStatCard
            icon={Icons.MessageCircle}
            label="Messages"
            value={content.messages ?? 0}
            accentClass="text-cyan-400"
          />
        </div>
      </motion.section>

      {/* ── Report Status + User Activity ──────────────────────────────────── */}
      <motion.section variants={sectionVariants} className="mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Report status */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Flag className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Report Status</h3>
              <span className="ml-auto text-xs text-white/40">{reports.total ?? 0} total</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Pending',
                  value: reports.pending ?? 0,
                  colorClass: 'text-amber-400',
                  bgClass: 'bg-amber-400/10 border-amber-400/20',
                  icon: <Icons.AlertTriangle className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Resolved',
                  value: reports.resolved ?? 0,
                  colorClass: 'text-emerald-400',
                  bgClass: 'bg-emerald-400/10 border-emerald-400/20',
                  icon: <Icons.CheckCircle className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Total',
                  value: reports.total ?? 0,
                  colorClass: 'text-white/70',
                  bgClass: 'bg-white/5 border-white/10',
                  icon: <Icons.BarChart2 className="w-3.5 h-3.5" />,
                },
              ].map(({ label, value, colorClass, bgClass, icon }) => (
                <div
                  key={label}
                  className={`rounded-xl border p-3 text-center ${bgClass}`}
                >
                  <div className={`flex justify-center mb-1 ${colorClass}`}>{icon}</div>
                  <p className={`text-xl font-bold font-heading tabular-nums ${colorClass}`}>
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <ReportStatusBar
              pending={reports.pending ?? 0}
              resolved={reports.resolved ?? 0}
              total={reports.total ?? 0}
            />
          </div>

          {/* User activity */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">User Activity</h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'Total registered',
                  value: users.total ?? 0,
                  pct: 100,
                  barClass: 'bg-blue-400',
                },
                {
                  label: 'Active last 7 days',
                  value: users.active7d ?? 0,
                  pct:
                    users.total > 0
                      ? Math.round(((users.active7d ?? 0) / users.total) * 100)
                      : 0,
                  barClass: 'bg-emerald-400',
                },
                {
                  label: 'New last 30 days',
                  value: users.new30d ?? 0,
                  pct:
                    users.total > 0
                      ? Math.round(((users.new30d ?? 0) / users.total) * 100)
                      : 0,
                  barClass: 'bg-violet-400',
                },
                {
                  label: 'Banned',
                  value: users.banned ?? 0,
                  pct:
                    users.total > 0
                      ? Math.round(((users.banned ?? 0) / users.total) * 100)
                      : 0,
                  barClass: 'bg-rose-400',
                },
              ].map(({ label, value, pct, barClass }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{label}</span>
                    <span className="text-xs font-semibold text-white/70 tabular-nums">
                      {value.toLocaleString()}
                      <span className="text-white/30 font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── User Growth Chart ──────────────────────────────────────────────── */}
      {charts.userGrowth && charts.userGrowth.length > 0 && (
        <motion.section variants={sectionVariants} className="mb-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Icons.BarChart2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">User Growth</h3>
              <span className="text-xs text-white/40 ml-auto">Last 30 days</span>
            </div>
            <BarChart
              data={charts.userGrowth}
              accentClass="bg-blue-400"
              gradientFrom="#1d4ed8"
              gradientTo="#60a5fa"
            />
          </div>
        </motion.section>
      )}

      {/* ── Role Distribution ──────────────────────────────────────────────── */}
      {charts.roleDistribution && charts.roleDistribution.length > 0 && (
        <motion.section variants={sectionVariants} className="mb-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Shield className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Role Distribution</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {charts.roleDistribution.map((role) => {
                const total = charts.roleDistribution.reduce((s, r) => s + r.count, 0);
                const pct = total > 0 ? Math.round((role.count / total) * 100) : 0;
                const roleColors = {
                  admin: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                  moderator: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                  user: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                };
                const cls = roleColors[role._id] ?? 'text-white/60 bg-white/5 border-white/10';

                return (
                  <div
                    key={role._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cls}`}
                  >
                    <span className="text-sm font-bold tabular-nums">{role.count.toLocaleString()}</span>
                    <span className="text-xs capitalize opacity-70">{role._id}</span>
                    <span className="text-xs opacity-50">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Quick Links ────────────────────────────────────────────────────── */}
      <motion.section variants={sectionVariants} className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">
          Quick access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLinkCard
            icon={Icons.Users}
            title="Users"
            description="Manage user accounts, roles, bans, and view detailed activity."
            href="/admin/users"
            accentClass="text-blue-400"
            bgClass="bg-blue-500"
            badge={users.total ?? 0}
            badgeClass="text-blue-400 bg-blue-400/10 border-blue-400/20"
          />
          <QuickLinkCard
            icon={Icons.Flag}
            title="Reports"
            description="Review and resolve user reports. Pending items need attention."
            href="/admin/reports"
            accentClass="text-amber-400"
            bgClass="bg-amber-500"
            badge={(reports.pending ?? 0) > 0 ? `${reports.pending} pending` : 'All clear'}
            badgeClass={
              (reports.pending ?? 0) > 0
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            }
          />
          <QuickLinkCard
            icon={Icons.Grid}
            title="Content"
            description="Moderate pins, posts, events, and reviews across the platform."
            href="/admin/content"
            accentClass="text-emerald-400"
            bgClass="bg-emerald-500"
            badge={totalContent > 0 ? `${totalContent.toLocaleString()} items` : undefined}
            badgeClass="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
          />
        </div>
      </motion.section>

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <motion.div variants={sectionVariants} className="text-center pb-4">
        <p className="text-xs text-white/20">
          Data refreshes on page load &middot;{' '}
          <button
            onClick={fetchStats}
            className="underline underline-offset-2 hover:text-white/40 transition-colors"
          >
            Refresh now
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}
