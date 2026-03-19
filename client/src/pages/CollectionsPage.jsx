import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { collectionApi } from '../api/collectionApi';
import { userApi } from '../api/userApi';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

// ─── icons ──────────────────────────────────────────────────────────────────
function ShareIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function LinkIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CopyIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// ─── animation variants ───────────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 280 } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.18 } },
};

// ─── emoji picker options ────────────────────────────────────────────────────
const EMOJIS = ['📌', '❤️', '🌟', '🏔️', '🍽️', '🎭', '🛍️', '🏖️', '🎵', '📸', '🌿', '✈️'];

// ─── helpers ─────────────────────────────────────────────────────────────────
function VisibilityBadge({ isPublic }) {
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        isPublic
          ? 'bg-accent-primary/15 text-accent-primary'
          : 'bg-surface-hover text-txt-muted'
      }`}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

function CollectionCard({ collection, onDelete, onExpand, onShare, isExpanded, currentUserId }) {
  const pinCount = collection.pins?.length ?? 0;
  const collabCount = collection.collaborators?.length ?? 0;
  const isOwner = collection.owner === currentUserId || collection.owner?._id === currentUserId;
  const myRole = isOwner ? 'owner' : collection.collaborators?.find(
    c => (c.user?._id || c.user) === currentUserId
  )?.role || null;
  const cover =
    collection.coverImage ||
    collection.pins?.find((p) => p.images?.[0])?.images?.[0] ||
    null;

  return (
    <motion.div
      variants={cardVariants}
      layout
      className="glass rounded-xl border border-surface-divider overflow-hidden cursor-pointer group"
      onClick={() => onExpand(collection._id)}
    >
      {/* Cover strip */}
      <div className="relative h-28 bg-surface-hover flex items-center justify-center overflow-hidden">
        {cover ? (
          <img src={cover} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl select-none">{collection.emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Top-right actions */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {(isOwner || myRole === 'editor') && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(collection); }}
              className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white
                         flex items-center justify-center hover:bg-violet-500/80"
              title="Share & Collaborate"
            >
              <ShareIcon />
            </button>
          )}
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(collection); }}
              className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white
                         flex items-center justify-center hover:bg-red-500/80"
              title="Delete collection"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>

        {/* Bottom-left badges */}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          {collabCount > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm
                             text-white text-[10px] font-medium">
              <UsersIcon width="10" height="10" /> {collabCount}
            </span>
          )}
          {collection.shareToken && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm
                             text-white text-[10px] font-medium">
              <LinkIcon width="10" height="10" /> Shared
            </span>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        {!cover && (
          <span className="text-xl">{collection.emoji}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-txt-primary text-sm font-semibold truncate">{collection.name}</p>
            {!isOwner && myRole && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent-secondary/15 text-accent-secondary capitalize">
                {myRole}
              </span>
            )}
          </div>
          <p className="text-txt-muted text-xs">{pinCount} {pinCount === 1 ? 'pin' : 'pins'}</p>
        </div>
        <VisibilityBadge isPublic={collection.isPublic} />
      </div>

      {/* Expanded pins */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.25 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pb-3 border-t border-surface-divider pt-2">
              {pinCount === 0 ? (
                <p className="text-txt-muted text-xs text-center py-3">No pins yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {collection.pins.slice(0, 6).map((pin) => (
                    <div
                      key={pin._id}
                      className="aspect-square rounded-lg bg-surface-hover overflow-hidden flex items-center justify-center"
                    >
                      {pin.images?.[0] ? (
                        <img src={pin.images[0]} alt={pin.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-txt-muted text-xs text-center px-1 line-clamp-2">{pin.title}</span>
                      )}
                    </div>
                  ))}
                  {pinCount > 6 && (
                    <div className="aspect-square rounded-lg bg-surface-hover flex items-center justify-center">
                      <span className="text-txt-muted text-xs font-semibold">+{pinCount - 6}</span>
                    </div>
                  )}
                </div>
              )}
              {collection.description && (
                <p className="text-txt-secondary text-xs mt-2 leading-relaxed">{collection.description}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── create modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('📌');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), emoji, isPublic });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative glass rounded-xl border border-surface-divider w-full max-w-sm p-5 shadow-2xl"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 300 } }}
        exit={{ scale: 0.92, opacity: 0 }}
      >
        <h2 className="text-txt-primary font-bold text-lg mb-4">New Collection</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-txt-secondary text-xs font-medium mb-1.5 block">Name</label>
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My favourite spots…"
              className="w-full bg-surface-hover border border-surface-divider rounded-lg px-3 py-2
                         text-txt-primary placeholder-txt-muted text-sm focus:outline-none
                         focus:border-accent-violet transition-colors"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-txt-secondary text-xs font-medium mb-1.5 block">Emoji</label>
            <div className="grid grid-cols-6 gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-9 rounded-lg text-xl flex items-center justify-center transition-all
                    ${emoji === e
                      ? 'bg-violet-500/20 ring-2 ring-violet-500'
                      : 'bg-surface-hover hover:bg-surface-hover/80'
                    }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-txt-primary text-sm font-medium">Public</p>
              <p className="text-txt-muted text-xs">Anyone can discover this collection</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200
                ${isPublic ? 'bg-gradient-to-r from-blue-500 to-violet-500' : 'bg-surface-hover border border-surface-divider'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                            transition-transform duration-200 ${isPublic ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-surface-divider text-txt-secondary text-sm
                         hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-semibold
                         hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── delete confirmation modal ────────────────────────────────────────────────
function DeleteModal({ collection, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(collection._id);
    setLoading(false);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative glass rounded-xl border border-surface-divider w-full max-w-xs p-5 shadow-2xl"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 300 } }}
        exit={{ scale: 0.92, opacity: 0 }}
      >
        <h3 className="text-txt-primary font-bold text-base mb-2">Delete collection?</h3>
        <p className="text-txt-muted text-sm mb-5">
          "<span className="text-txt-secondary font-medium">{collection.name}</span>" will be permanently deleted.
          Pins inside won't be affected.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-surface-divider text-txt-secondary text-sm
                       hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold
                       hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── share & collaborate modal ────────────────────────────────────────────────
function ShareModal({ collection, currentUserId, onClose, onUpdate }) {
  const isOwner = collection.owner === currentUserId || collection.owner?._id === currentUserId;
  const [tab, setTab] = useState('share'); // 'share' | 'collaborators'
  const [shareLink, setShareLink] = useState(collection.shareToken || '');
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // collaborator add
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addRole, setAddRole] = useState('viewer');

  const collaborators = collection.collaborators || [];

  const fullShareUrl = shareLink
    ? `${window.location.origin}/collections/shared/${shareLink}`
    : '';

  const handleGenerateLink = async () => {
    setLinkLoading(true);
    try {
      const res = await collectionApi.generateShareLink(collection._id);
      const token = res.data.data.shareToken;
      setShareLink(token);
      onUpdate({ ...collection, shareToken: token });
      toast.success('Share link generated');
    } catch {
      toast.error('Failed to generate link');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleRevokeLink = async () => {
    setLinkLoading(true);
    try {
      await collectionApi.revokeShareLink(collection._id);
      setShareLink('');
      onUpdate({ ...collection, shareToken: null });
      toast.success('Share link revoked');
    } catch {
      toast.error('Failed to revoke link');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchUsers = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await userApi.searchUsers(q);
      const users = res.data.data || res.data || [];
      // Filter out owner and existing collaborators
      const existing = new Set(collaborators.map(c => c.user?._id || c.user));
      existing.add(currentUserId);
      setSearchResults(users.filter(u => !existing.has(u._id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [collaborators, currentUserId]);

  useEffect(() => {
    const t = setTimeout(() => handleSearchUsers(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearchUsers]);

  const handleAddCollaborator = async (userId) => {
    try {
      const res = await collectionApi.addCollaborator(collection._id, { userId, role: addRole });
      const updated = res.data.data;
      onUpdate(updated);
      setSearchQuery('');
      setSearchResults([]);
      toast.success('Collaborator added');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      const res = await collectionApi.updateCollaboratorRole(collection._id, userId, { role });
      onUpdate(res.data.data);
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await collectionApi.removeCollaborator(collection._id, userId);
      const updated = {
        ...collection,
        collaborators: collaborators.filter(c => (c.user?._id || c.user) !== userId),
      };
      onUpdate(updated);
      toast.success('Collaborator removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative glass rounded-xl border border-surface-divider w-full max-w-md p-5 shadow-2xl max-h-[80vh] flex flex-col"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 22, stiffness: 300 } }}
        exit={{ scale: 0.92, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-txt-primary font-bold text-lg">Share &amp; Collaborate</h2>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 p-0.5 bg-surface-hover rounded-lg">
          {['share', 'collaborators'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all
                ${tab === t
                  ? 'bg-base text-txt-primary shadow-sm'
                  : 'text-txt-muted hover:text-txt-secondary'
                }`}
            >
              {t === 'share' ? 'Share Link' : `Collaborators (${collaborators.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Share Link tab ── */}
          {tab === 'share' && (
            <div className="flex flex-col gap-3">
              <p className="text-txt-muted text-xs">
                Anyone with the link can view and optionally join as a collaborator.
              </p>
              {shareLink ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={fullShareUrl}
                      className="flex-1 bg-surface-hover border border-surface-divider rounded-lg px-3 py-2
                                 text-txt-primary text-xs font-mono truncate"
                    />
                    <button
                      onClick={handleCopy}
                     className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-semibold
                                hover:opacity-90 flex items-center gap-1.5 transition-opacity"
                    >
                      <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {isOwner && (
                    <button
                      onClick={handleRevokeLink}
                      disabled={linkLoading}
                      className="text-red-400 text-xs hover:text-red-300 self-start disabled:opacity-60"
                    >
                      {linkLoading ? 'Revoking…' : 'Revoke link'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGenerateLink}
                  disabled={linkLoading || !isOwner}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white
                             text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  <LinkIcon /> {linkLoading ? 'Generating…' : 'Generate Share Link'}
                </button>
              )}
            </div>
          )}

          {/* ── Collaborators tab ── */}
          {tab === 'collaborators' && (
            <div className="flex flex-col gap-3">
              {/* Search to add */}
              {isOwner && (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users to add…"
                      className="flex-1 bg-surface-hover border border-surface-divider rounded-lg px-3 py-2
                                 text-txt-primary placeholder-txt-muted text-sm focus:outline-none
                                 focus:border-accent-violet transition-colors"
                    />
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                      className="bg-surface-hover border border-surface-divider rounded-lg px-2 py-2
                                 text-txt-primary text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  {/* Search results */}
                  {searchLoading && <p className="text-txt-muted text-xs py-1">Searching…</p>}
                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {searchResults.slice(0, 5).map((u) => (
                        <div key={u._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover">
                          <img
                            src={u.avatar || '/default-avatar.png'}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="flex-1 text-txt-primary text-sm truncate">{u.name}</span>
                          <button
                            onClick={() => handleAddCollaborator(u._id)}
                            className="px-2 py-1 rounded bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-semibold
                                       hover:opacity-90 transition-opacity"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Current collaborators list */}
              {collaborators.length === 0 ? (
                <p className="text-txt-muted text-xs text-center py-4">No collaborators yet</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {collaborators.map((collab) => {
                    const u = collab.user || {};
                    const userId = u._id || collab.user;
                    return (
                      <div key={userId} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-surface-hover/50">
                        <img
                          src={u.avatar || '/default-avatar.png'}
                          alt={u.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-txt-primary text-sm font-medium truncate">{u.name || 'User'}</p>
                          <p className="text-txt-muted text-[10px] capitalize">{collab.role}</p>
                        </div>
                        {isOwner && (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={collab.role}
                              onChange={(e) => handleUpdateRole(userId, e.target.value)}
                              className="bg-surface-hover border border-surface-divider rounded px-1.5 py-0.5
                                         text-txt-primary text-[10px] focus:outline-none"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              onClick={() => handleRemoveCollaborator(userId)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Remove"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {!isOwner && userId === currentUserId && (
                          <button
                            onClick={() => handleRemoveCollaborator(userId)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Leave
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── skeleton cards ───────────────────────────────────────────────────────────
function CollectionSkeleton() {
  return (
    <div className="glass rounded-xl border border-surface-divider overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="px-3 py-2.5 flex gap-2">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const navigate          = useNavigate();
  const { user }          = useSelector((s) => s.auth);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [toDelete, setToDelete]       = useState(null);   // collection object
  const [toShare, setToShare]         = useState(null);    // collection object for share modal
  const [expandedId, setExpandedId]   = useState(null);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await collectionApi.getMyCollections();
      setCollections(res.data.data);
    } catch {
      setError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    const res = await collectionApi.createCollection(data);
    setCollections((prev) => [res.data.data, ...prev]);
  };

  const handleDelete = async (id) => {
    await collectionApi.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c._id !== id));
  };

  const handleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleShareUpdate = (updated) => {
    setCollections((prev) => prev.map((c) => c._id === updated._id ? updated : c));
    setToShare(updated);
  };

  return (
    <motion.div
      className="flex flex-col h-full overflow-y-auto"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="max-w-2xl w-full mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-txt-primary text-2xl font-bold tracking-tight">My Collections</h1>
            <p className="text-txt-muted text-sm mt-0.5">
              {loading ? '' : `${collections.length} / 20 collections`}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90
                       text-white text-sm font-semibold px-4 py-2 rounded-xl transition-opacity shadow-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Collection
          </motion.button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="glass rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4 text-red-400 text-sm">
            {error}
            <button onClick={fetchCollections} className="ml-3 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CollectionSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && collections.length === 0 && !error && (
          <EmptyState
            title="No collections yet"
            description="Group your favourite pins into collections to keep them organised."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 text-white text-sm
                           font-semibold px-5 py-2.5 rounded-xl transition-opacity"
              >
                Create your first collection
              </button>
            }
          />
        )}

        {/* ── Collections grid ── */}
        {!loading && collections.length > 0 && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {collections.map((col) => (
                <CollectionCard
                  key={col._id}
                  collection={col}
                  onDelete={setToDelete}
                  onExpand={handleExpand}
                  onShare={setToShare}
                  isExpanded={expandedId === col._id}
                  currentUserId={user?._id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
        {toDelete && (
          <DeleteModal
            collection={toDelete}
            onClose={() => setToDelete(null)}
            onConfirm={handleDelete}
          />
        )}
        {toShare && (
          <ShareModal
            collection={toShare}
            currentUserId={user?._id}
            onClose={() => setToShare(null)}
            onUpdate={handleShareUpdate}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
