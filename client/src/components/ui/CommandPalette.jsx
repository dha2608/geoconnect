import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setActivePanel, openModal, closePanel } from '../../features/ui/uiSlice';

/* ─────────────────────────────────────────────────────────────────────────────
 * CommandPalette — Cmd+K / Ctrl+K quick-action launcher
 * ───────────────────────────────────────────────────────────────────────────── */

const CATEGORIES = {
  navigation: 'Navigation',
  panels: 'Panels',
  create: 'Create',
  map: 'Map',
  account: 'Account',
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const paletteVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.96, y: -20, transition: { duration: 0.15 } },
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  // ── Command definitions ────────────────────────────────────────────────────
  const commands = useMemo(
    () => [
      // Navigation
      { id: 'nav-home', label: 'Go to Map', category: 'navigation', icon: '🗺️', action: () => navigate('/') },
      { id: 'nav-explore', label: 'Go to Explore', category: 'navigation', icon: '🧭', action: () => navigate('/explore') },
      { id: 'nav-activity', label: 'Go to Activity', category: 'navigation', icon: '📊', action: () => navigate('/activity') },
      { id: 'nav-profile', label: 'Go to Profile', category: 'navigation', icon: '👤', action: () => navigate(`/profile/${user?._id || ''}`) },
      { id: 'nav-settings', label: 'Go to Settings', category: 'navigation', icon: '⚙️', action: () => navigate('/settings') },

      // Panels
      { id: 'panel-feed', label: 'Open Feed', category: 'panels', icon: '📰', action: () => dispatch(setActivePanel('feed')) },
      { id: 'panel-messages', label: 'Open Messages', category: 'panels', icon: '💬', action: () => dispatch(setActivePanel('messages')) },
      { id: 'panel-notifications', label: 'Open Notifications', category: 'panels', icon: '🔔', action: () => dispatch(setActivePanel('notifications')) },
      { id: 'panel-events', label: 'Open Events', category: 'panels', icon: '📅', action: () => dispatch(setActivePanel('events')) },
      { id: 'panel-search', label: 'Open Search', category: 'panels', icon: '🔍', action: () => dispatch(setActivePanel('search')) },
      { id: 'panel-close', label: 'Close Panel', category: 'panels', icon: '✕', action: () => dispatch(closePanel()) },

      // Create
      { id: 'create-pin', label: 'Create Pin', category: 'create', icon: '📍', action: () => dispatch(openModal('createPin')) },
      { id: 'create-post', label: 'Create Post', category: 'create', icon: '✍️', action: () => dispatch(openModal('createPost')) },
      { id: 'create-event', label: 'Create Event', category: 'create', icon: '🎉', action: () => dispatch(openModal('createEvent')) },

      // Map
      { id: 'map-route', label: 'Open Routing Tool', category: 'map', icon: '🛤️', keywords: 'directions navigate' },
      { id: 'map-draw', label: 'Open Drawing Tools', category: 'map', icon: '✏️', keywords: 'annotate sketch' },
      { id: 'map-measure', label: 'Measure Distance', category: 'map', icon: '📏', keywords: 'ruler' },

      // Account
      { id: 'account-logout', label: 'Log Out', category: 'account', icon: '🚪', keywords: 'sign out exit' },
    ],
    [dispatch, navigate, user?._id],
  );

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.keywords && cmd.keywords.toLowerCase().includes(q)),
    );
  }, [query, commands]);

  // ── Keyboard shortcut (Cmd/Ctrl + K) ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // ── Focus input on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Keep selected in view ─────────────────────────────────────────────────
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex];
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Execute a command ─────────────────────────────────────────────────────
  const execute = useCallback(
    (cmd) => {
      setOpen(false);
      if (cmd.action) cmd.action();
    },
    [],
  );

  // ── Keyboard navigation inside the palette ────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        execute(filtered[selectedIndex]);
      }
    },
    [filtered, selectedIndex, execute],
  );

  // ── Reset index when filter changes ───────────────────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Group filtered by category ────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    for (const cmd of filtered) {
      if (!map[cmd.category]) map[cmd.category] = [];
      map[cmd.category].push(cmd);
    }
    return map;
  }, [filtered]);

  // Flat index helper — we need to map grouped display to a flat index
  let flatIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-lg mx-4 rounded-2xl glass border border-surface-divider shadow-2xl overflow-hidden"
            variants={paletteVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-divider">
              <svg
                className="w-5 h-5 text-txt-muted shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-txt-primary placeholder-txt-muted text-sm outline-none"
                placeholder="Type a command..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-hover text-txt-muted text-[10px] font-mono border border-surface-divider">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-80 overflow-y-auto py-2 scrollbar-thin"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-txt-muted text-sm">
                  No commands found
                </div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-txt-muted">
                      {CATEGORIES[cat] || cat}
                    </div>
                    {items.map((cmd) => {
                      flatIdx++;
                      const idx = flatIdx;
                      return (
                        <button
                          key={cmd.id}
                          role="option"
                          aria-selected={idx === selectedIndex}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            idx === selectedIndex
                              ? 'bg-accent-primary/15 text-accent-primary'
                              : 'text-txt-secondary hover:bg-surface-hover'
                          }`}
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          <span className="text-base w-6 text-center shrink-0">
                            {cmd.icon}
                          </span>
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {idx === selectedIndex && (
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-hover text-[10px] font-mono text-txt-muted border border-surface-divider">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-surface-divider text-[10px] text-txt-muted">
              <div className="flex items-center gap-2">
                <kbd className="px-1 py-0.5 rounded bg-surface-hover border border-surface-divider font-mono">↑↓</kbd>
                <span>Navigate</span>
                <kbd className="px-1 py-0.5 rounded bg-surface-hover border border-surface-divider font-mono">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-surface-hover border border-surface-divider font-mono">⌘K</kbd>
                <span>Toggle</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
