import { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import { setTileLayer } from '../../features/map/mapSlice';
import toast from 'react-hot-toast';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'geoconnect_map_bookmarks';
const MAX_BOOKMARKS = 10;

const TILE_ICONS = {
  dark:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  street:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>,
  light:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  satellite: '🛰️',
  terrain:   '⛰️',
};

/* ─── LocalStorage helpers ───────────────────────────────────────────────── */

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistBookmarks(bookmarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Silently ignore storage quota errors
  }
}

/* ─── BookmarkItem ───────────────────────────────────────────────────────── */

function BookmarkItem({ bookmark, onRestore, onDelete, onRename }) {
  const [editing, setEditing]     = useState(false);
  const [draftName, setDraftName] = useState(bookmark.name);
  const inputRef                  = useRef(null);

  // Keep draftName in sync with the prop (in case parent renames it externally)
  useEffect(() => {
    if (!editing) setDraftName(bookmark.name);
  }, [bookmark.name, editing]);

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== bookmark.name) {
      onRename(bookmark.id, trimmed);
    } else {
      setDraftName(bookmark.name); // revert if blank / unchanged
    }
    setEditing(false);
  }, [draftName, bookmark.id, bookmark.name, onRename]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  { commitRename(); }
    if (e.key === 'Escape') { setDraftName(bookmark.name); setEditing(false); }
  };

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 hover:bg-surface-hover rounded-lg mx-1 transition-colors cursor-pointer"
      onClick={() => !editing && onRestore(bookmark)}
      role="button"
      tabIndex={editing ? -1 : 0}
      onKeyDown={(e) => !editing && e.key === 'Enter' && onRestore(bookmark)}
      aria-label={`Restore view: ${bookmark.name}`}
    >
      {/* Tile-layer emoji icon */}
      <span className="text-sm flex-shrink-0 leading-none" aria-hidden="true">
        {TILE_ICONS[bookmark.tileLayer] ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>}
      </span>

      {/* Name + coordinates */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-bg-base border border-accent-primary/40 rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none focus:ring-1 focus:ring-accent-primary/50 transition-shadow"
            maxLength={40}
            aria-label="Rename bookmark"
          />
        ) : (
          <p
            className="text-xs font-medium text-txt-primary truncate leading-tight"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            title={`${bookmark.name} · double-click to rename`}
          >
            {bookmark.name}
          </p>
        )}
        <p className="text-[10px] text-txt-muted mt-0.5 font-mono leading-tight tabular-nums">
          {bookmark.center[0].toFixed(4)}, {bookmark.center[1].toFixed(4)}
        </p>
      </div>

      {/* Zoom level badge */}
      <span className="flex-shrink-0 text-[10px] font-mono bg-accent-primary/10 text-accent-primary px-1.5 py-0.5 rounded-md leading-tight">
        z{bookmark.zoom}
      </span>

      {/* Action buttons — visible on hover */}
      <div
        className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rename */}
        <button
          onClick={() => setEditing(true)}
          className="w-5 h-5 flex items-center justify-center text-txt-muted hover:text-accent-primary transition-colors rounded"
          title="Rename"
          aria-label="Rename bookmark"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(bookmark.id)}
          className="w-5 h-5 flex items-center justify-center text-txt-muted hover:text-accent-danger transition-colors rounded"
          title="Delete bookmark"
          aria-label="Delete bookmark"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── MapBookmarks ───────────────────────────────────────────────────────── */

/**
 * MapBookmarks — floating widget for saving and restoring map views.
 *
 * Rendered INSIDE <MapContainer> so it can call useMap().
 * Persists bookmarks to localStorage under `geoconnect_map_bookmarks`.
 * Max 10 bookmarks; restoring flies the map and optionally switches tile layer.
 */
export default function MapBookmarks() {
  const map      = useMap();
  const dispatch = useDispatch();
  const { tileLayer } = useSelector((state) => state.map);

  const [open, setOpen]           = useState(false);
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks());
  const containerRef              = useRef(null);

  /* Isolate this widget from Leaflet's pointer event system */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  /* Sync to localStorage whenever bookmarks array changes */
  useEffect(() => {
    persistBookmarks(bookmarks);
  }, [bookmarks]);

  /* ── Save current view ───────────────────────────────────────────── */
  const saveCurrentView = useCallback(() => {
    if (bookmarks.length >= MAX_BOOKMARKS) {
      toast.error('Maximum 10 saved views reached. Delete one to continue.');
      return;
    }

    const { lat, lng } = map.getCenter();
    const zoom         = Math.round(map.getZoom());
    const viewNumber   = bookmarks.length + 1;

    const newBookmark = {
      id:        Date.now(),
      name:      `View ${viewNumber}`,
      center:    [parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6))],
      zoom,
      tileLayer,
    };

    setBookmarks((prev) => [newBookmark, ...prev]);
    toast.success(`Saved "${newBookmark.name}"`, { duration: 2000 });
  }, [map, bookmarks.length, tileLayer]);

  /* ── Restore a saved view ────────────────────────────────────────── */
  const restoreBookmark = useCallback((bookmark) => {
    // Switch tile layer first if needed
    if (bookmark.tileLayer && bookmark.tileLayer !== tileLayer) {
      dispatch(setTileLayer(bookmark.tileLayer));
    }
    map.flyTo(bookmark.center, bookmark.zoom, { duration: 1.5 });
    toast.success(`Restored "${bookmark.name}"`, { duration: 1500 });
    setOpen(false);
  }, [map, tileLayer, dispatch]);

  /* ── Delete a bookmark ───────────────────────────────────────────── */
  const deleteBookmark = useCallback((id) => {
    setBookmarks((prev) => {
      const target = prev.find((b) => b.id === id);
      const next   = prev.filter((b) => b.id !== id);
      if (target) toast.success(`Deleted "${target.name}"`, { duration: 1500 });
      return next;
    });
  }, []);

  /* ── Rename a bookmark ───────────────────────────────────────────── */
  const renameBookmark = useCallback((id, newName) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b))
    );
  }, []);

  const isFull = bookmarks.length >= MAX_BOOKMARKS;

  return (
    <div ref={containerRef} className="absolute right-4 bottom-40 z-[1000]">

      {/* ── Expanded panel — slides in from the right ──────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-12 bottom-0 glass rounded-xl w-64 flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(360px, calc(100vh - 220px))' }}
            role="dialog"
            aria-label="Saved map views"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-divider flex-shrink-0">
              <span className="text-sm font-semibold text-txt-primary font-heading">
                Saved Views
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  isFull
                    ? 'bg-accent-danger/10 text-accent-danger'
                    : 'bg-surface-hover text-txt-muted'
                }`}
              >
                {bookmarks.length}/{MAX_BOOKMARKS}
              </span>
            </div>

            {/* Bookmark list */}
            <div className="flex-1 overflow-y-auto py-1 min-h-0">
              <AnimatePresence initial={false}>
                {bookmarks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-8 text-center select-none"
                  >
                    <svg
                      className="w-9 h-9 mx-auto mb-2.5 text-txt-muted opacity-30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
                    </svg>
                    <p className="text-xs font-medium text-txt-muted">No saved views yet.</p>
                    <p className="text-[10px] text-txt-muted opacity-60 mt-1 leading-relaxed">
                      Navigate to any spot and hit<br />"Save Current View" below.
                    </p>
                  </motion.div>
                ) : (
                  bookmarks.map((bm) => (
                    <motion.div
                      key={bm.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 16, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                    >
                      <BookmarkItem
                        bookmark={bm}
                        onRestore={restoreBookmark}
                        onDelete={deleteBookmark}
                        onRename={renameBookmark}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer: Save button */}
            <div className="px-3 py-2.5 border-t border-surface-divider flex-shrink-0">
              <button
                onClick={saveCurrentView}
                disabled={isFull}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 active:bg-accent-primary/30 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                title={isFull ? 'Remove a view to save a new one' : 'Save current map view'}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                {isFull ? 'Limit reached (10/10)' : 'Save Current View'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle button ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative w-10 h-10 rounded-xl glass flex items-center justify-center transition-colors ${
          open
            ? 'text-accent-primary ring-1 ring-accent-primary/30'
            : 'text-txt-primary hover:text-accent-primary'
        }`}
        title={open ? 'Close saved views' : 'Saved views'}
        aria-label={open ? 'Close saved views panel' : 'Open saved views panel'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {/* Bookmark icon — filled when open */}
        <svg
          className="w-5 h-5 transition-all duration-150"
          viewBox="0 0 24 24"
          fill={open ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
        </svg>

        {/* Bookmark count badge (hidden while panel is open) */}
        <AnimatePresence>
          {bookmarks.length > 0 && !open && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-accent-primary text-[9px] font-bold text-white flex items-center justify-center leading-none shadow-md pointer-events-none"
              aria-hidden="true"
            >
              {bookmarks.length}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
