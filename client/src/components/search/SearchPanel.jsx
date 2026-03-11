/**
 * SearchPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Location search side panel for GeoConnect.
 * Renders when state.ui.activePanel === 'search' (see AppLayout).
 *
 * Layout
 *   • Spring slide-in from the right, fixed right-0 top-16 → bottom-0
 *   • Width 400 px desktop / full-screen mobile (bottom-16 for MobileNav)
 *   • Glass morphism consistent with existing panels
 *
 * Features
 *   • Auto-focused search input with clear button / mini-spinner
 *   • Debounced (400 ms) Nominatim search via /api/geocode/search
 *   • Results: place name, truncated address, colour-coded type badge
 *   • Click a result → flyToLocation + close panel
 *   • Recent searches persisted in localStorage (max 5, deduplicated)
 *   • Empty / loading / no-results / error states
 *
 * Deviations from brief (auto-fixed per executor rules):
 *   [Rule 1] `searchLocation` export not found in geocodeApi.js →
 *            using `geocodeApi.search(query)` (the real export).
 *   [Rule 1] `setCenter` + `setZoom` replaced by `flyToLocation({ lat, lng, zoom })`
 *            which is the single purpose-built action for animated map fly.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { closePanel } from '../../features/ui/uiSlice';
import { flyToLocation, setDestination } from '../../features/map/mapSlice';
import { geocodeApi } from '../../api/geocodeApi';
import GlassCard from '../ui/GlassCard';
import LoadingSpinner from '../ui/LoadingSpinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY    = 'geoconnect_recent_searches';
const MAX_RECENT    = 5;
const DEBOUNCE_MS   = 400;
const MIN_QUERY_LEN = 2;

const PANEL_SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 };

// ─── Nominatim type → display metadata ────────────────────────────────────────

const TYPE_META = {
  city:            { label: 'City',          color: '#3b82f6' },
  town:            { label: 'Town',          color: '#06b6d4' },
  village:         { label: 'Village',       color: '#10b981' },
  hamlet:          { label: 'Hamlet',        color: '#10b981' },
  suburb:          { label: 'Suburb',        color: '#8b5cf6' },
  neighbourhood:   { label: 'Neighbourhood', color: '#ec4899' },
  road:            { label: 'Road',          color: '#f59e0b' },
  residential:     { label: 'Area',          color: '#f97316' },
  country:         { label: 'Country',       color: '#ef4444' },
  state:           { label: 'State',         color: '#6366f1' },
  county:          { label: 'County',        color: '#84cc16' },
  administrative:  { label: 'Region',        color: '#a855f7' },
  postcode:        { label: 'Postcode',      color: '#64748b' },
  natural:         { label: 'Natural',       color: '#22c55e' },
  water:           { label: 'Water',         color: '#0ea5e9' },
  tourism:         { label: 'Tourism',       color: '#f43f5e' },
  amenity:         { label: 'Amenity',       color: '#fb923c' },
  building:        { label: 'Building',      color: '#94a3b8' },
};

function resolveType(type, cls) {
  const info = TYPE_META[type] ?? TYPE_META[cls];
  if (info) return info;
  const raw = type ?? cls ?? 'place';
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), color: '#94a3b8' };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); }
  catch { return []; }
}

function persistRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }
  catch { /* storage unavailable or quota exceeded */ }
}

function prependRecent(item, list) {
  return [item, ...list.filter((r) => r.place_id !== item.place_id)].slice(0, MAX_RECENT);
}

// ─── SVG icons (no lucide-react) ──────────────────────────────────────────────

const IconSearch = ({ className = 'w-[17px] h-[17px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconX = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconPin = ({ className = 'w-[15px] h-[15px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconClock = ({ className = 'w-[13px] h-[13px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconChevronRight = () => (
  <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const IconNavDest = ({ className = 'w-[12px] h-[12px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);

const IconAlert = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── Mini spinner (Framer Motion, no global CSS needed) ───────────────────────

function MiniSpinner() {
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
      className="w-4 h-4 block"
      viewBox="0 0 24 24" fill="none"
      stroke="#3b82f6" strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </motion.svg>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────

function EmptyIllustration() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      {/* Outer rings */}
      <circle cx="64" cy="64" r="61" stroke="rgba(59,130,246,0.12)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="44" stroke="rgba(59,130,246,0.08)" strokeWidth="1.5" strokeDasharray="5 5" />
      {/* Magnifier */}
      <circle cx="56" cy="56" r="22" stroke="rgba(59,130,246,0.30)" strokeWidth="2.5"
        fill="rgba(59,130,246,0.04)" />
      <line x1="71" y1="71" x2="85" y2="85" stroke="rgba(59,130,246,0.30)" strokeWidth="3" strokeLinecap="round" />
      {/* Map pin inside magnifier */}
      <path d="M56 45c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11z"
        fill="rgba(6,182,212,0.16)" stroke="rgba(6,182,212,0.55)" strokeWidth="1.5" />
      <circle cx="56" cy="56" r="3.5" fill="rgba(6,182,212,0.7)" />
      {/* Ambient dots */}
      <circle cx="95" cy="40" r="2.5" fill="rgba(59,130,246,0.28)" />
      <circle cx="28" cy="86" r="2"   fill="rgba(6,182,212,0.28)" />
      <circle cx="100" cy="79" r="1.5" fill="rgba(59,130,246,0.18)" />
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" fill="none" aria-hidden="true">
      <circle cx="46" cy="46" r="32" stroke="rgba(59,130,246,0.20)" strokeWidth="2.5"
        fill="rgba(59,130,246,0.03)" />
      <line x1="68" y1="68" x2="88" y2="88" stroke="rgba(59,130,246,0.20)" strokeWidth="3" strokeLinecap="round" />
      {/* X cross */}
      <line x1="35" y1="35" x2="57" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="35" x2="35" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="46" cy="46" r="20" stroke="rgba(239,68,68,0.10)" strokeWidth="1" />
    </svg>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ result, onSelect, onSetDestination, index, isRecent = false }) {
  const parts     = (result.display_name ?? '').split(', ');
  const placeName = parts[0] || 'Unknown place';
  const address   = parts.slice(1).join(', ');
  const { label, color } = resolveType(result.type, result.class);

  return (
    <motion.div
      role="option"
      aria-selected="false"
      aria-label={`Go to ${result.display_name}`}
      tabIndex={0}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.20, ease: 'easeOut' }}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.975 }}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={[
        'w-full flex items-center gap-3 p-3 rounded-xl text-left',
        'border transition-all duration-200 cursor-pointer',
        'border-[rgba(59,130,246,0.10)] bg-[rgba(15,21,32,0.68)]',
        'hover:bg-[rgba(15,21,32,0.88)] hover:border-[rgba(59,130,246,0.28)]',
      ].join(' ')}
      style={{ boxShadow: 'none' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Icon bubble */}
      <span
        aria-hidden="true"
        className="flex-shrink-0 flex items-center justify-center rounded-[10px]"
        style={{
          width: 38, height: 38,
          background: isRecent ? 'rgba(71,85,105,0.18)' : 'rgba(59,130,246,0.10)',
          border: `1px solid ${isRecent ? 'rgba(71,85,105,0.26)' : 'rgba(59,130,246,0.20)'}`,
          color: isRecent ? '#64748b' : '#3b82f6',
        }}
      >
        {isRecent ? <IconClock className="w-[14px] h-[14px]" /> : <IconPin className="w-[14px] h-[14px]" />}
      </span>

      {/* Text */}
      <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
        {/* Name row + type badge */}
        <span className="flex items-center gap-2">
          <span className="font-body text-[13.5px] font-semibold text-txt-primary truncate flex-1">
            {placeName}
          </span>
          <span
            className="flex-shrink-0 font-body text-[9.5px] font-bold tracking-[0.05em] uppercase rounded-[5px] px-[6px] py-[2px]"
            style={{
              color,
              background: `${color}1a`,
              border: `1px solid ${color}33`,
            }}
          >
            {label}
          </span>
        </span>

        {/* Address */}
        {address && (
          <span className="font-body text-[11.5px] text-txt-muted truncate">
            {address}
          </span>
        )}
      </span>

      {/* Destination button */}
      {onSetDestination && (
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
          aria-label={`Set ${result.display_name} as destination`}
          title="Set as destination"
          className="flex-shrink-0 flex items-center justify-center rounded-lg
                     transition-all duration-150"
          style={{
            width: 26, height: 26,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.24)',
            color: '#ef4444',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.20)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.44)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.10)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.24)';
          }}
        >
          <IconNavDest />
        </motion.button>
      )}

      {/* Chevron */}
      <span className="flex-shrink-0 text-[#334155]">
        <IconChevronRight />
      </span>
    </motion.div>
  );
}

// ─── State view: Loading ──────────────────────────────────────────────────────

function ViewLoading() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col items-center justify-center pt-16 gap-3.5"
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="md" />
      <p className="font-body text-[13px] text-txt-muted">Searching…</p>
    </motion.div>
  );
}

// ─── State view: No results ────────────────────────────────────────────────────

function ViewNoResults({ query }) {
  const display = query.length > 26 ? `${query.slice(0, 26)}…` : query;

  return (
    <motion.div
      key="no-results"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center pt-10 gap-5"
    >
      <NoResultsIllustration />
      <GlassCard animate={false} padding="p-5" className="text-center max-w-[240px]">
        <h3 className="font-heading text-[15px] font-bold text-txt-secondary mb-1.5">
          No results found
        </h3>
        <p className="font-body text-[12.5px] text-txt-muted leading-relaxed">
          No places match{' '}
          <strong className="text-[#64748b] font-semibold">"{display}"</strong>.
          Try a different term.
        </p>
      </GlassCard>
    </motion.div>
  );
}

// ─── State view: Empty (no query, no recent) ───────────────────────────────────

function ViewEmpty() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.30, delay: 0.08 }}
      className="flex flex-col items-center pt-10 gap-5"
    >
      <EmptyIllustration />
      <GlassCard animate={false} padding="p-5" className="text-center max-w-[250px]">
        <h3 className="font-heading text-[15px] font-bold text-txt-secondary mb-1.5">
          Find any place
        </h3>
        <p className="font-body text-[12.5px] text-txt-muted leading-relaxed">
          Search for cities, landmarks, addresses, or points of interest anywhere in the world.
        </p>
      </GlassCard>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SearchPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isMobile } = useSelector((s) => s.ui);

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recent,      setRecent]      = useState(loadRecent);

  const inputRef   = useRef(null);
  const wrapRef    = useRef(null);
  const timerRef   = useRef(null);

  // ── Auto-focus after entrance animation ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);

    if (query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await geocodeApi.search(query.trim());
        setResults(Array.isArray(data) ? data : []);
        setHasSearched(true);
      } catch {
        setError('Search failed — check your connection and try again.');
        setResults([]);
        setHasSearched(false);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => dispatch(closePanel()), [dispatch]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    navigate('/');
    dispatch(flyToLocation({ lat, lng, zoom: 15 }));

    setRecent((prev) => {
      const updated = prependRecent(result, prev);
      persistRecent(updated);
      return updated;
    });

    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSetDestination = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const parts = (result.display_name ?? '').split(', ');
    dispatch(setDestination({ lat, lng, name: parts[0], address: parts.slice(1).join(', ') }));
    dispatch(flyToLocation({ lat, lng, zoom: 16 }));
    navigate('/');
    setRecent((prev) => { const updated = prependRecent(result, prev); persistRecent(updated); return updated; });
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleClearRecent = useCallback(() => {
    setRecent([]);
    persistRecent([]);
  }, []);

  // Focus ring on input wrapper
  const focusRing   = () => {
    if (wrapRef.current) {
      wrapRef.current.style.borderColor = 'rgba(59,130,246,0.50)';
      wrapRef.current.style.boxShadow   = '0 0 0 3px rgba(59,130,246,0.10)';
    }
  };
  const blurRing = () => {
    if (wrapRef.current) {
      wrapRef.current.style.borderColor = 'rgba(59,130,246,0.18)';
      wrapRef.current.style.boxShadow   = 'none';
    }
  };

  // ── Active view ──────────────────────────────────────────────────────────────

  const activeView = (() => {
    if (isLoading)                       return 'loading';
    if (hasSearched && results.length)   return 'results';
    if (hasSearched)                     return 'no-results';
    if (recent.length)                   return 'recent';
    return 'empty';
  })();

  // ── Responsive layout ────────────────────────────────────────────────────────

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col overflow-hidden'
    : 'fixed top-16 bottom-0 right-0 w-[400px] z-20 flex flex-col overflow-hidden';

  const motionProps = isMobile
    ? {
        initial:    { opacity: 0, y: 24 },
        animate:    { opacity: 1, y: 0  },
        exit:       { opacity: 0, y: 24 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial:    { x: 400 },
        animate:    { x: 0   },
        exit:       { x: 400 },
        transition: PANEL_SPRING,
      };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.aside
      key="search-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Search locations"
      {...motionProps}
      className={panelClass}
      style={{
        background:              'rgba(8,11,18,0.94)',
        backdropFilter:          'blur(28px) saturate(160%)',
        WebkitBackdropFilter:    'blur(28px) saturate(160%)',
        borderLeft:              '1px solid rgba(59,130,246,0.12)',
        boxShadow:               '-12px 0 48px rgba(0,0,0,0.50)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-[rgba(59,130,246,0.08)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-primary/15 flex items-center justify-center text-accent-primary">
            <IconSearch className="w-4 h-4" />
          </div>
          <h2 className="font-heading text-[15px] font-bold text-txt-primary tracking-tight">
            Search
          </h2>
        </div>

        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleClose}
          aria-label="Close search panel"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted
                     hover:text-txt-primary hover:bg-white/5 transition-all duration-150
                     border border-[rgba(59,130,246,0.12)] hover:border-[rgba(59,130,246,0.28)]"
        >
          <IconX className="w-3.5 h-3.5" />
        </motion.button>
      </header>

      {/* ── Search input ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-3.5 pb-2">
        <div
          ref={wrapRef}
          className="relative flex items-center rounded-xl transition-all duration-200"
          style={{
            background:           'rgba(15,21,32,0.72)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:               '1px solid rgba(59,130,246,0.18)',
          }}
        >
          {/* Left search icon */}
          <span
            aria-hidden="true"
            className="absolute left-[13px] flex text-txt-muted pointer-events-none"
          >
            <IconSearch className="w-[17px] h-[17px]" />
          </span>

          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={focusRing}
            onBlur={blurRing}
            placeholder="Search cities, addresses, places…"
            aria-label="Search for a location"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            className="w-full bg-transparent border-none outline-none font-body text-sm
                       text-txt-primary placeholder:text-txt-muted"
            style={{ padding: '13px 44px 13px 42px', caretColor: '#3b82f6' }}
          />

          {/* Right: mini spinner or clear button */}
          <span className="absolute right-[12px] flex items-center">
            {isLoading ? (
              <MiniSpinner />
            ) : query ? (
              <motion.button
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                onClick={handleClear}
                aria-label="Clear search input"
                className="w-[24px] h-[24px] flex items-center justify-center rounded-md
                           bg-[rgba(71,85,105,0.28)] text-txt-muted hover:text-txt-primary
                           transition-colors duration-150"
              >
                <IconX className="w-[11px] h-[11px]" />
              </motion.button>
            ) : null}
          </span>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.20 }}
            role="alert"
            aria-live="assertive"
            className="flex-shrink-0 mx-4 my-1 flex items-center gap-2 px-3.5 py-[10px]
                       rounded-xl text-[13px] font-body"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border:     '1px solid rgba(239,68,68,0.22)',
              color:      '#fca5a5',
            }}
          >
            <span className="flex-shrink-0 text-[#f87171]"><IconAlert /></span>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
      >
        <AnimatePresence mode="wait">

          {/* Loading */}
          {activeView === 'loading' && <ViewLoading key="loading" />}

          {/* Results list */}
          {activeView === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <p
                className="font-body text-[11.5px] text-txt-muted mb-2.5"
                aria-live="polite"
              >
                {results.length} location{results.length !== 1 ? 's' : ''} found
              </p>
              <ul
                role="listbox"
                aria-label="Search results"
                className="flex flex-col gap-1.5"
              >
                {results.map((r, i) => (
                  <li key={r.place_id ?? i}>
                    <ResultCard
                      result={r}
                      onSelect={() => handleSelect(r)}
                      onSetDestination={() => handleSetDestination(r)}
                      index={i}
                    />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* No results */}
          {activeView === 'no-results' && (
            <ViewNoResults key="no-results" query={query.trim()} />
          )}

          {/* Recent searches */}
          {activeView === 'recent' && (
            <motion.div
              key="recent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Section header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-txt-muted flex">
                    <IconClock className="w-[13px] h-[13px]" />
                  </span>
                  <span className="font-heading text-[11px] font-bold text-[#64748b] uppercase tracking-[0.07em]">
                    Recent
                  </span>
                </div>
                <button
                  onClick={handleClearRecent}
                  aria-label="Clear all recent searches"
                  className="font-body text-[12px] text-txt-muted hover:text-txt-secondary
                             transition-colors duration-150 px-1.5 py-0.5 rounded-md
                             hover:bg-white/5"
                >
                  Clear all
                </button>
              </div>

              <ul
                role="list"
                aria-label="Recent searches"
                className="flex flex-col gap-1.5"
              >
                {recent.map((r, i) => (
                  <li key={r.place_id ?? i}>
                    <ResultCard
                      result={r}
                      onSelect={() => handleSelect(r)}
                      onSetDestination={() => handleSetDestination(r)}
                      index={i}
                      isRecent
                    />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Empty state */}
          {activeView === 'empty' && <ViewEmpty key="empty" />}

        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
