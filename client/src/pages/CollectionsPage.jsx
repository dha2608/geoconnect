import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { collectionApi } from '../api/collectionApi';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

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

function CollectionCard({ collection, onDelete, onExpand, isExpanded }) {
  const pinCount = collection.pins?.length ?? 0;
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

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(collection); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white
                     flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                     hover:bg-red-500/80"
          title="Delete collection"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        {!cover && (
          <span className="text-xl">{collection.emoji}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-txt-primary text-sm font-semibold truncate">{collection.name}</p>
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
                         focus:border-accent-primary transition-colors"
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
                      ? 'bg-accent-primary/20 ring-2 ring-accent-primary'
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
                ${isPublic ? 'bg-accent-primary' : 'bg-surface-hover border border-surface-divider'}`}
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
              className="flex-1 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold
                         hover:bg-accent-primary/90 disabled:opacity-60 transition-colors"
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
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90
                       text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
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
                className="mt-4 bg-accent-primary hover:bg-accent-primary/90 text-white text-sm
                           font-semibold px-5 py-2.5 rounded-xl transition-colors"
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
                  isExpanded={expandedId === col._id}
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
      </AnimatePresence>
    </motion.div>
  );
}
