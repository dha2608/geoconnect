import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminReportApi } from '../../api/adminApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Color maps ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:    { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400'   },
  reviewed:   { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  resolved:   { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  dismissed:  { bg: 'bg-white/10',       text: 'text-white/40',    border: 'border-white/10',       dot: 'bg-white/30'    },
};

const REASON_STYLES = {
  spam:           { bg: 'bg-yellow-500/20',  text: 'text-yellow-400'  },
  harassment:     { bg: 'bg-red-500/20',     text: 'text-red-400'     },
  hate_speech:    { bg: 'bg-rose-500/20',    text: 'text-rose-400'    },
  violence:       { bg: 'bg-orange-500/20',  text: 'text-orange-400'  },
  inappropriate:  { bg: 'bg-purple-500/20',  text: 'text-purple-400'  },
  impersonation:  { bg: 'bg-cyan-500/20',    text: 'text-cyan-400'    },
  other:          { bg: 'bg-gray-500/20',    text: 'text-gray-400'    },
};

const TARGET_STYLES = {
  user:    { bg: 'bg-sky-500/20',     text: 'text-sky-400'     },
  post:    { bg: 'bg-violet-500/20',  text: 'text-violet-400'  },
  pin:     { bg: 'bg-teal-500/20',    text: 'text-teal-400'    },
  event:   { bg: 'bg-pink-500/20',    text: 'text-pink-400'    },
  review:  { bg: 'bg-lime-500/20',    text: 'text-lime-400'    },
  message: { bg: 'bg-indigo-500/20',  text: 'text-indigo-400'  },
};

const STAT_COLORS = {
  total:     'from-white/10 to-white/5   text-white',
  pending:   'from-amber-500/20 to-amber-500/5   text-amber-400',
  reviewed:  'from-blue-500/20 to-blue-500/5     text-blue-400',
  resolved:  'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
  dismissed: 'from-white/10 to-white/5   text-white/40',
};

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

// ─── ReportDetailModal ───────────────────────────────────────────────────────

function ReportDetailModal({ report, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(report.status);
  const [adminNote, setAdminNote] = useState(report.adminNote ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reasonStyle  = REASON_STYLES[report.reason]  ?? REASON_STYLES.other;
  const targetStyle  = TARGET_STYLES[report.targetType] ?? TARGET_STYLES.user;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminReportApi.updateReportStatus(report._id, { status, adminNote });
      onUpdate({ ...report, status, adminNote });
      onClose();
    } catch {
      setError('Failed to update report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError('');
    try {
      await adminReportApi.deleteReport(report._id);
      onDelete(report._id);
      onClose();
    } catch {
      setError('Failed to delete report. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Panel */}
        <motion.div
          className="relative w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold text-lg">Report Details</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Reporter */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Reporter</p>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                {report.reporter?.avatar ? (
                  <img
                    src={report.reporter.avatar}
                    alt={report.reporter.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium">
                    {(report.reporter?.name ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{report.reporter?.name ?? 'Unknown'}</p>
                  <p className="text-white/40 text-xs">{report.reporter?._id ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Target + Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Target Type</p>
                <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${targetStyle.bg} ${targetStyle.text}`}>
                  {report.targetType}
                </span>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Reason</p>
                <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-medium ${reasonStyle.bg} ${reasonStyle.text}`}>
                  {report.reason?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Target ID */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Target ID</p>
              <p className="font-mono text-white/70 text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10 break-all">
                {report.targetId ?? '—'}
              </p>
            </div>

            {/* Description */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Description</p>
              <p className="text-white/80 text-sm bg-white/5 rounded-xl p-3 border border-white/10 leading-relaxed">
                {report.description || <span className="text-white/30 italic">No description provided.</span>}
              </p>
            </div>

            {/* Reported */}
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Reported {timeAgo(report.createdAt)}</span>
              {report.updatedAt !== report.createdAt && (
                <span>Updated {timeAgo(report.updatedAt)}</span>
              )}
            </div>

            {/* Status update */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Update Status</p>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/40 transition-colors"
              >
                {['pending', 'reviewed', 'resolved', 'dismissed'].map(s => (
                  <option key={s} value={s} className="bg-gray-900 text-white">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin note */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Admin Note</p>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Optional note for this report…"
                rows={3}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                confirmDelete
                  ? 'bg-red-500/30 text-red-400 border border-red-500/40 hover:bg-red-500/40'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:text-red-400 hover:border-red-500/30'
              } disabled:opacity-50`}
            >
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-white/20 border border-white/20 hover:bg-white/25 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── ReportCard ──────────────────────────────────────────────────────────────

const ReportCard = memo(function ReportCard({ report, onSelect, onQuickAction }) {
  const [expanded, setExpanded] = useState(false);

  const reasonStyle  = REASON_STYLES[report.reason]  ?? REASON_STYLES.other;
  const targetStyle  = TARGET_STYLES[report.targetType] ?? TARGET_STYLES.user;
  const statusStyle  = STATUS_STYLES[report.status]  ?? STATUS_STYLES.pending;

  const quickActions = (() => {
    switch (report.status) {
      case 'pending':
        return [
          { label: 'Review',  next: 'reviewed',  cls: 'text-blue-400 hover:bg-blue-500/20 border-blue-500/30'   },
          { label: 'Resolve', next: 'resolved',  cls: 'text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30' },
          { label: 'Dismiss', next: 'dismissed', cls: 'text-white/40 hover:bg-white/10 border-white/10'         },
        ];
      case 'reviewed':
        return [
          { label: 'Resolve', next: 'resolved',  cls: 'text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30' },
          { label: 'Dismiss', next: 'dismissed', cls: 'text-white/40 hover:bg-white/10 border-white/10'         },
        ];
      case 'resolved':
        return [
          { label: 'Reopen', next: 'pending', cls: 'text-amber-400 hover:bg-amber-500/20 border-amber-500/30' },
        ];
      case 'dismissed':
        return [
          { label: 'Reopen', next: 'pending', cls: 'text-amber-400 hover:bg-amber-500/20 border-amber-500/30' },
        ];
      default:
        return [];
    }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Reporter */}
        <div className="flex items-center gap-3 min-w-0">
          {report.reporter?.avatar ? (
            <img
              src={report.reporter.avatar}
              alt={report.reporter.name}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium flex-shrink-0">
              {(report.reporter?.name ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{report.reporter?.name ?? 'Unknown'}</p>
            <p className="text-white/40 text-xs">{timeAgo(report.createdAt)}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${targetStyle.bg} ${targetStyle.text}`}>
            {report.targetType}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${reasonStyle.bg} ${reasonStyle.text}`}>
            {report.reason?.replace(/_/g, ' ')}
          </span>
          <StatusBadge status={report.status} />
        </div>
      </div>

      {/* Description */}
      {report.description && (
        <div className="mt-3">
          <p className={`text-white/60 text-sm leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {report.description}
          </p>
          {report.description.length > 120 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-white/30 hover:text-white/60 text-xs mt-1 transition-colors"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map(action => (
            <button
              key={action.next}
              onClick={() => onQuickAction(report._id, action.next)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border bg-transparent transition-all ${action.cls}`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect(report)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 border border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
        >
          View Details →
        </button>
      </div>
    </motion.div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminReports() {
  const navigate = useNavigate();

  // Data
  const [reports, setReports] = useState([]);
  const [stats, setStats]     = useState(null);
  const [meta, setMeta]       = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // UI state
  const [loading, setLoading]       = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]           = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    reason: 'all',
    targetType: 'all',
    sort: 'newest',
    page: 1,
  });

  // ── Fetch stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminReportApi.getReportStats();
      setStats(res.data?.data ?? null);
    } catch {
      // stats non-critical, silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch reports ────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page:  filters.page,
        limit: 10,
        sort:  filters.sort === 'newest' ? '-createdAt' : 'createdAt',
      };
      if (filters.status !== 'all')     params.status     = filters.status;
      if (filters.reason !== 'all')     params.reason     = filters.reason;
      if (filters.targetType !== 'all') params.targetType = filters.targetType;

      const res = await adminReportApi.getReports(params);
      setReports(res.data?.data ?? []);
      setMeta(res.data?.meta ?? { page: 1, limit: 10, total: 0, pages: 1 });
    } catch {
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));

  const handleQuickAction = useCallback(async (id, newStatus) => {
    try {
      await adminReportApi.updateReportStatus(id, { status: newStatus });
      setReports(prev => prev.map(r => r._id === id ? { ...r, status: newStatus } : r));
      fetchStats(); // refresh counts
    } catch {
      // silently fail for quick actions; user can use detail modal
    }
  }, [fetchStats]);

  const handleModalUpdate = useCallback((updated) => {
    setReports(prev => prev.map(r => r._id === updated._id ? updated : r));
    fetchStats();
  }, [fetchStats]);

  const handleModalDelete = useCallback((id) => {
    setReports(prev => prev.filter(r => r._id !== id));
    fetchStats();
  }, [fetchStats]);

  // ── Stat helpers ─────────────────────────────────────────────────────────
  const getCount = (arr, key) => {
    if (!arr) return 0;
    const found = arr.find(x => x._id === key);
    return found?.count ?? 0;
  };

  const pendingCount = stats
    ? getCount(stats.byStatus, 'pending')
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-between gap-4 flex-wrap"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              ←
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">Report Management</h1>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <p className="text-white/40 text-sm mt-0.5">Review and manage user-submitted reports</p>
            </div>
          </div>

          <button
            onClick={() => { fetchReports(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            ↺ Refresh
          </button>
        </motion.div>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {[
            { key: 'total',     label: 'Total',     value: stats?.total ?? 0 },
            { key: 'pending',   label: 'Pending',   value: getCount(stats?.byStatus, 'pending')   },
            { key: 'reviewed',  label: 'Reviewed',  value: getCount(stats?.byStatus, 'reviewed')  },
            { key: 'resolved',  label: 'Resolved',  value: getCount(stats?.byStatus, 'resolved')  },
            { key: 'dismissed', label: 'Dismissed', value: getCount(stats?.byStatus, 'dismissed') },
          ].map(stat => (
            <div
              key={stat.key}
              className={`bg-gradient-to-br ${STAT_COLORS[stat.key]} backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-white/20 transition-all`}
              onClick={() => stat.key !== 'total' && setFilter('status', stat.key)}
            >
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
              {statsLoading ? (
                <div className="h-7 w-10 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Filters bar ──────────────────────────────────────────────────── */}
        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flex flex-wrap gap-3">
            {/* Status */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <label className="text-white/40 text-xs uppercase tracking-wider">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilter('status', e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/40 transition-colors"
              >
                {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map(v => (
                  <option key={v} value={v} className="bg-gray-900 text-white">
                    {v === 'all' ? 'All Statuses' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1 min-w-[155px]">
              <label className="text-white/40 text-xs uppercase tracking-wider">Reason</label>
              <select
                value={filters.reason}
                onChange={e => setFilter('reason', e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/40 transition-colors"
              >
                {['all', 'spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'impersonation', 'other'].map(v => (
                  <option key={v} value={v} className="bg-gray-900 text-white">
                    {v === 'all' ? 'All Reasons' : v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Target type */}
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-white/40 text-xs uppercase tracking-wider">Target Type</label>
              <select
                value={filters.targetType}
                onChange={e => setFilter('targetType', e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/40 transition-colors"
              >
                {['all', 'user', 'post', 'pin', 'event', 'review', 'message'].map(v => (
                  <option key={v} value={v} className="bg-gray-900 text-white">
                    {v === 'all' ? 'All Types' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1 min-w-[130px]">
              <label className="text-white/40 text-xs uppercase tracking-wider">Sort</label>
              <select
                value={filters.sort}
                onChange={e => setFilter('sort', e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/40 transition-colors"
              >
                <option value="newest" className="bg-gray-900 text-white">Newest First</option>
                <option value="oldest" className="bg-gray-900 text-white">Oldest First</option>
              </select>
            </div>

            {/* Clear filters */}
            {(filters.status !== 'all' || filters.reason !== 'all' || filters.targetType !== 'all') && (
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: 'all', reason: 'all', targetType: 'all', page: 1 }))}
                  className="px-4 py-2 rounded-xl text-sm text-white/40 border border-white/10 hover:text-white hover:border-white/20 bg-transparent transition-all"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Reports list ──────────────────────────────────────────────────── */}
        <div>
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-white/10 rounded w-32" />
                      <div className="h-2.5 bg-white/5 rounded w-16" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-14 bg-white/10 rounded-full" />
                      <div className="h-6 w-16 bg-white/10 rounded-full" />
                      <div className="h-6 w-18 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2.5 bg-white/5 rounded w-full" />
                    <div className="h-2.5 bg-white/5 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-red-400 font-medium">{error}</p>
              <button
                onClick={fetchReports}
                className="mt-3 px-4 py-2 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* Empty */}
          {!loading && !error && reports.length === 0 && (
            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-4xl mb-3">📋</div>
              <p className="text-white font-medium">No reports found</p>
              <p className="text-white/40 text-sm mt-1">
                {filters.status !== 'all' || filters.reason !== 'all' || filters.targetType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No reports have been submitted yet'}
              </p>
            </motion.div>
          )}

          {/* List */}
          {!loading && !error && reports.length > 0 && (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {reports.map(report => (
                  <ReportCard
                    key={report._id}
                    report={report}
                    onSelect={setSelectedReport}
                    onQuickAction={handleQuickAction}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {!loading && !error && meta.pages > 1 && (
          <motion.div
            className="flex items-center justify-between gap-4 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => setFilter('page', filters.page - 1)}
              disabled={filters.page <= 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2 text-sm text-white/40">
              <span>Page</span>
              <span className="text-white font-medium">{meta.page}</span>
              <span>of</span>
              <span className="text-white font-medium">{meta.pages}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{meta.total.toLocaleString()} total</span>
            </div>

            <button
              onClick={() => setFilter('page', filters.page + 1)}
              disabled={filters.page >= meta.pages}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdate={handleModalUpdate}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  );
}
