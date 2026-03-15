import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { adminApi } from '../../api/adminApi';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const ROLE_STYLES = {
  admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  moderator: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  user: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const ROLE_OPTIONS = ['user', 'moderator', 'admin'];

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

const INITIAL_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];
function initialColor(name) {
  const code = (name || '').charCodeAt(0) || 0;
  return INITIAL_COLORS[code % INITIAL_COLORS.length];
}

/* ─── Toast ────────────────────────────────────────────────────────────────── */

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
    : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-xl ${bg}`}
    >
      {message}
    </motion.div>
  );
}

/* ─── Ban Modal ────────────────────────────────────────────────────────────── */

function BanModal({ user, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-1">Ban User</h3>
        <p className="text-sm text-white/60 mb-4">
          Ban <span className="text-white font-medium">{user?.name}</span> from the platform.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for ban (optional)..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="px-4 py-2 text-sm bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Banning...' : 'Confirm Ban'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delete Modal ─────────────────────────────────────────────────────────── */

function DeleteModal({ user, onConfirm, onCancel, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-1">Delete User</h3>
        <p className="text-sm text-white/60 mb-2">
          Permanently delete <span className="text-white font-medium">{user?.name}</span>?
        </p>
        <p className="text-sm text-rose-400/80 mb-4">
          This will permanently delete the user and all their content (pins, posts, events, reviews).
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── User Row ─────────────────────────────────────────────────────────────── */

const UserRow = memo(function UserRow({ user, isSelf, onRoleChange, onBan, onUnban, onDelete }) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
    }
    if (roleOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roleOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors"
    >
      {/* Top: avatar + info */}
      <div className="flex items-start gap-3">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${initialColor(user.name)}`}>
            {getInitial(user.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{user.name}</p>
          <p className="text-xs text-white/40 truncate">{user.email}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 text-xs rounded-full border ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}>
            {user.role}
          </span>
          {user.isBanned ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Banned
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
        <span>Joined {formatDate(user.createdAt)}</span>
        <span>{user.followersCount ?? 0} followers</span>
        <span>{user.followingCount ?? 0} following</span>
      </div>

      {user.isBanned && user.bannedReason && (
        <p className="mt-2 text-xs text-rose-300/70 bg-rose-500/10 rounded-lg px-3 py-1.5">
          Ban reason: {user.bannedReason}
        </p>
      )}

      {/* Actions */}
      {!isSelf && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Role change dropdown */}
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setRoleOpen(!roleOpen)}
              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Role ▾
            </button>
            <AnimatePresence>
              {roleOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-0 top-full mt-1 z-20 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden min-w-[120px]"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => { onRoleChange(user._id, r); setRoleOpen(false); }}
                      disabled={r === user.role}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        r === user.role ? 'text-white/30 cursor-not-allowed' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ban/Unban */}
          {user.isBanned ? (
            <button
              onClick={() => onUnban(user)}
              className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Unban
            </button>
          ) : (
            <button
              onClick={() => onBan(user)}
              className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              Ban
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(user)}
            className="px-3 py-1.5 text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {isSelf && (
        <p className="mt-3 text-xs text-white/30 italic">This is your account</p>
      )}
    </motion.div>
  );
});

/* ─── Skeleton ─────────────────────────────────────────────────────────────── */

function UserSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded" />
          <div className="h-3 w-48 bg-white/5 rounded" />
        </div>
      </div>
      <div className="flex gap-4 mt-3">
        <div className="h-3 w-24 bg-white/5 rounded" />
        <div className="h-3 w-20 bg-white/5 rounded" />
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */

export default function AdminUsers() {
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth.user);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [banTarget, setBanTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Toast state
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20, sort };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.banned = statusFilter === 'banned' ? 'true' : 'false';
      const res = await adminApi.getUsers(params);
      setUsers(res.data.data || []);
      setMeta(res.data.meta || { total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, sort]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Actions
  const handleRoleChange = useCallback(async (userId, role) => {
    try {
      await adminApi.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u));
      showToast(`Role updated to ${role}`);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update role', 'error');
    }
  }, [showToast]);

  const handleBanConfirm = useCallback(async (reason) => {
    if (!banTarget) return;
    setActionLoading(true);
    try {
      await adminApi.toggleBanUser(banTarget._id, { action: 'ban', reason });
      setUsers((prev) => prev.map((u) =>
        u._id === banTarget._id ? { ...u, isBanned: true, bannedReason: reason } : u
      ));
      showToast(`${banTarget.name} has been banned`);
      setBanTarget(null);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to ban user', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [banTarget, showToast]);

  const handleUnban = useCallback(async (user) => {
    try {
      await adminApi.toggleBanUser(user._id, { action: 'unban' });
      setUsers((prev) => prev.map((u) =>
        u._id === user._id ? { ...u, isBanned: false, bannedReason: undefined } : u
      ));
      showToast(`${user.name} has been unbanned`);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to unban user', 'error');
    }
  }, [showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminApi.deleteUser(deleteTarget._id);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setMeta((prev) => ({ ...prev, total: prev.total - 1 }));
      showToast(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget, showToast]);

  const selectClass = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer';

  return (
    <div className="min-h-screen bg-base p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-white/40">{meta.total} users total</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filters */}
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={selectClass}>
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>

            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>

            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={selectClass}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Users list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <UserSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-rose-300 mb-3">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/40 text-lg mb-1">No users found</p>
            <p className="text-white/30 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {users.map((user) => (
                <UserRow
                  key={user._id}
                  user={user}
                  isSelf={currentUser?._id === user._id}
                  onRoleChange={handleRoleChange}
                  onBan={setBanTarget}
                  onUnban={handleUnban}
                  onDelete={setDeleteTarget}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-white/40">
              Page {page} of {meta.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              disabled={page === meta.pages}
              className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {banTarget && (
          <BanModal
            user={banTarget}
            onConfirm={handleBanConfirm}
            onCancel={() => setBanTarget(null)}
            loading={actionLoading}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            user={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
