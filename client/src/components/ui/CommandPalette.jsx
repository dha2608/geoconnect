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
      { id: 'nav-home',          label: 'Go to Map',          category: 'navigation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>, action: () => navigate('/') },
      { id: 'nav-explore',       label: 'Go to Explore',      category: 'navigation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>, action: () => navigate('/explore') },
      { id: 'nav-activity',      label: 'Go to Activity',     category: 'navigation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, action: () => navigate('/activity') },
      { id: 'nav-profile',       label: 'Go to Profile',      category: 'navigation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, action: () => navigate(`/profile/${user?._id || ''}`) },
      { id: 'nav-settings',      label: 'Go to Settings',     category: 'navigation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>, action: () => navigate('/settings') },

      // Panels
      { id: 'panel-feed',          label: 'Open Feed',          category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>, action: () => dispatch(setActivePanel('feed')) },
      { id: 'panel-messages',      label: 'Open Messages',      category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, action: () => dispatch(setActivePanel('messages')) },
      { id: 'panel-notifications', label: 'Open Notifications', category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>, action: () => dispatch(setActivePanel('notifications')) },
      { id: 'panel-events',        label: 'Open Events',        category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>, action: () => dispatch(setActivePanel('events')) },
      { id: 'panel-search',        label: 'Open Search',        category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>, action: () => dispatch(setActivePanel('search')) },
      { id: 'panel-close',         label: 'Close Panel',        category: 'panels', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>, action: () => dispatch(closePanel()) },

      // Create
      { id: 'create-pin',   label: 'Create Pin',   category: 'create', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>, action: () => dispatch(openModal('createPin')) },
      { id: 'create-post',  label: 'Create Post',  category: 'create', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>, action: () => dispatch(openModal('createPost')) },
      { id: 'create-event', label: 'Create Event', category: 'create', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>, action: () => dispatch(openModal('createEvent')) },

      // Map
      { id: 'map-route',   label: 'Open Routing Tool',  category: 'map', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>, keywords: 'directions navigate' },
      { id: 'map-draw',    label: 'Open Drawing Tools', category: 'map', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>, keywords: 'annotate sketch' },
      { id: 'map-measure', label: 'Measure Distance',   category: 'map', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></svg>, keywords: 'ruler' },

      // Account
      { id: 'account-logout', label: 'Log Out', category: 'account', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>, keywords: 'sign out exit' },
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
                              ? 'bg-accent-violet/15 text-accent-violet'
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
