/**
 * SearchPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Unified search panel for GeoConnect.
 * Searches across locations, users, pins, and events in one interface.
 *
 * Layout
 *   - Spring slide-in from the right, fixed right-0 top-16 → bottom-0
 *   - Width 400 px desktop / full-screen mobile (bottom-16 for MobileNav)
 *   - Glass morphism consistent with existing panels
 *
 * Features
 *   - Auto-focused search input with clear button / mini-spinner
 *   - Tab bar: All | Places | Users | Pins | Events
 *   - Debounced (400 ms) parallel search across all categories
 *   - Results grouped by category in "All" tab, filtered in specific tabs
 *   - Click place → flyToLocation + close panel
 *   - Click user → navigate to profile
 *   - Click pin → fly to pin + open pin detail
 *   - Click event → fly to event + open event detail
 *   - Recent searches persisted in localStorage (max 5)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { closePanel, openModal } from '../../features/ui/uiSlice';
import { flyToLocation, setDestination } from '../../features/map/mapSlice';
import { searchUsers, clearSearch } from '../../features/users/userSlice';
import { searchPins, clearPinSearch, setSelectedPin } from '../../features/pins/pinSlice';
import { searchEvents, clearEventSearch, setSelectedEvent } from '../../features/events/eventSlice';
import { geocodeApi } from '../../api/geocodeApi';
import GlassCard from '../ui/GlassCard';
import LoadingSpinner from '../ui/LoadingSpinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY    = 'geoconnect_recent_searches';
const MAX_RECENT    = 5;
const DEBOUNCE_MS   = 400;
const MIN_QUERY_LEN = 2;

const PANEL_SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 };

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'places', label: 'Places' },
  { id: 'users',  label: 'Users' },
  { id: 'pins',   label: 'Pins' },
  { id: 'events', label: 'Events' },
];

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META = {
  places: { color: '#3b82f6', label: 'Place' },
  users:  { color: '#8b5cf6', label: 'User' },
  pins:   { color: '#10b981', label: 'Pin' },
  events: { color: '#f59e0b', label: 'Event' },
};

const PIN_CATEGORY_COLORS = {
  food:   '#f97316',
  nature: '#22c55e',
  art:    '#ec4899',
  event:  '#f59e0b',
  other:  '#64748b',
};

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
  const id = item._id || item.place_id || item.display_name;
  return [item, ...list.filter((r) => (r._id || r.place_id || r.display_name) !== id)].slice(0, MAX_RECENT);
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

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

const IconUser = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCalendar = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconMapPin = ({ className = 'w-[14px] h-[14px]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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

// ─── Mini spinner ─────────────────────────────────────────────────────────────

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
      <circle cx="64" cy="64" r="61" stroke="rgba(59,130,246,0.12)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="44" stroke="rgba(59,130,246,0.08)" strokeWidth="1.5" strokeDasharray="5 5" />
      <circle cx="56" cy="56" r="22" stroke="rgba(59,130,246,0.30)" strokeWidth="2.5"
        fill="rgba(59,130,246,0.04)" />
      <line x1="71" y1="71" x2="85" y2="85" stroke="rgba(59,130,246,0.30)" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 45c-6 0-11 5-11 11 0 8 11 18 11 18s11-10 11-18c0-6-5-11-11-11z"
        fill="rgba(6,182,212,0.16)" stroke="rgba(6,182,212,0.55)" strokeWidth="1.5" />
      <circle cx="56" cy="56" r="3.5" fill="rgba(6,182,212,0.7)" />
      <circle cx="95" cy="40" r="2.5" fill="rgba(59,130,246,0.28)" />
      <circle cx="28" cy="86" r="2" fill="rgba(6,182,212,0.28)" />
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
      <line x1="35" y1="35" x2="57" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="57" y1="35" x2="35" y2="57" stroke="rgba(239,68,68,0.50)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="46" cy="46" r="20" stroke="rgba(239,68,68,0.10)" strokeWidth="1" />
    </svg>
  );
}

// ─── Type badge component ─────────────────────────────────────────────────────

function TypeBadge({ label, color }) {
  return (
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
  );
}

// ─── Place result card ────────────────────────────────────────────────────────

function PlaceCard({ result, onSelect, onSetDestination, index, isRecent = false }) {
  const parts     = (result.display_name ?? '').split(', ');
  const placeName = parts[0] || 'Unknown place';
  const address   = parts.slice(1).join(', ');
  const { label, color } = resolveType(result.type, result.class);

  return (
    <motion.div
      role="option"
      aria-selected="false"
      tabIndex={0}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.975 }}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active"
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-[10px]"
        style={{
          width: 36, height: 36,
          background: isRecent ? 'rgba(71,85,105,0.18)' : 'rgba(59,130,246,0.10)',
          border: `1px solid ${isRecent ? 'rgba(71,85,105,0.26)' : 'rgba(59,130,246,0.20)'}`,
          color: isRecent ? '#64748b' : '#3b82f6',
        }}
      >
        {isRecent ? <IconClock className="w-[13px] h-[13px]" /> : <IconMapPin className="w-[13px] h-[13px]" />}
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        <span className="flex items-center gap-2">
          <span className="font-body text-[13px] font-semibold text-txt-primary truncate flex-1">{placeName}</span>
          <TypeBadge label={label} color={color} />
        </span>
        {address && <span className="font-body text-[11px] text-txt-muted truncate">{address}</span>}
      </span>
      {onSetDestination && (
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
          title="Set as destination"
          className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{
            width: 26, height: 26,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.24)',
            color: '#ef4444',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
        >
          <IconNavDest />
        </motion.button>
      )}
      <span className="flex-shrink-0 text-txt-muted"><IconChevronRight /></span>
    </motion.div>
  );
}

// ─── User result card ─────────────────────────────────────────────────────────

function UserCard({ user, onClick, index }) {
  const avatarUrl = user.avatar || null;

  return (
    <motion.div
      role="option"
      tabIndex={0}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active"
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden"
        style={{
          width: 36, height: 36,
          background: 'rgba(139,92,246,0.10)',
          border: '1px solid rgba(139,92,246,0.20)',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          : <IconUser className="w-[14px] h-[14px] text-[#8b5cf6]" />
        }
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        <span className="flex items-center gap-2">
          <span className="font-body text-[13px] font-semibold text-txt-primary truncate flex-1">{user.name}</span>
          <TypeBadge label="User" color="#8b5cf6" />
        </span>
        {user.bio && <span className="font-body text-[11px] text-txt-muted truncate">{user.bio}</span>}
        <span className="font-body text-[10px] text-txt-muted">
          {user.followers?.length ?? 0} followers
        </span>
      </span>
      <span className="flex-shrink-0 text-txt-muted"><IconChevronRight /></span>
    </motion.div>
  );
}

// ─── Pin result card ──────────────────────────────────────────────────────────

function PinCard({ pin, onClick, index }) {
  const catColor = PIN_CATEGORY_COLORS[pin.category] || '#64748b';
  const catLabel = pin.category ? pin.category.charAt(0).toUpperCase() + pin.category.slice(1) : 'Pin';

  return (
    <motion.div
      role="option"
      tabIndex={0}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active"
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-[10px] overflow-hidden"
        style={{
          width: 36, height: 36,
          background: `${catColor}15`,
          border: `1px solid ${catColor}30`,
        }}
      >
        {pin.images?.[0]
          ? <img src={pin.images[0]} alt="" className="w-full h-full object-cover" />
          : <IconPin className="w-[13px] h-[13px]" style={{ color: catColor }} />
        }
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        <span className="flex items-center gap-2">
          <span className="font-body text-[13px] font-semibold text-txt-primary truncate flex-1">{pin.title}</span>
          <TypeBadge label={catLabel} color={catColor} />
        </span>
        {pin.address && <span className="font-body text-[11px] text-txt-muted truncate">{pin.address}</span>}
        <span className="font-body text-[10px] text-txt-muted flex items-center gap-2">
          {pin.createdBy?.name && <span>by {pin.createdBy.name}</span>}
          {pin.likes?.length > 0 && <span>{pin.likes.length} likes</span>}
          {pin.averageRating > 0 && <span>{pin.averageRating.toFixed(1)} rating</span>}
        </span>
      </span>
      <span className="flex-shrink-0 text-txt-muted"><IconChevronRight /></span>
    </motion.div>
  );
}

// ─── Event result card ────────────────────────────────────────────────────────

function EventCard({ event, onClick, index }) {
  const startDate = event.startTime ? new Date(event.startTime) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const timeStr = startDate
    ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <motion.div
      role="option"
      tabIndex={0}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18, ease: 'easeOut' }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active"
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-[10px]"
        style={{
          width: 36, height: 36,
          background: 'rgba(245,158,11,0.10)',
          border: '1px solid rgba(245,158,11,0.20)',
          color: '#f59e0b',
        }}
      >
        <IconCalendar className="w-[14px] h-[14px]" />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        <span className="flex items-center gap-2">
          <span className="font-body text-[13px] font-semibold text-txt-primary truncate flex-1">{event.title}</span>
          <TypeBadge label="Event" color="#f59e0b" />
        </span>
        {event.address && <span className="font-body text-[11px] text-txt-muted truncate">{event.address}</span>}
        <span className="font-body text-[10px] text-txt-muted flex items-center gap-2">
          {dateStr && <span>{dateStr} {timeStr}</span>}
          {event.attendees?.length > 0 && <span>{event.attendees.length} attending</span>}
        </span>
      </span>
      <span className="flex-shrink-0 text-txt-muted"><IconChevronRight /></span>
    </motion.div>
  );
}

// ─── Section header for grouped results ───────────────────────────────────────

function SectionHeader({ icon, label, count, color }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1.5 first:mt-0">
      <span style={{ color }} className="flex">{icon}</span>
      <span className="font-body text-[11px] font-bold text-txt-muted uppercase tracking-[0.07em]">{label}</span>
      <span
        className="font-body text-[10px] font-bold rounded-full px-[6px] py-[1px]"
        style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── State views ──────────────────────────────────────────────────────────────

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
      <p className="font-body text-[13px] text-txt-muted">Searching...</p>
    </motion.div>
  );
}

function ViewNoResults({ query }) {
  const display = query.length > 26 ? `${query.slice(0, 26)}...` : query;
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
          No matches for{' '}
          <strong className="text-txt-secondary font-semibold">"{display}"</strong>.
          Try a different term.
        </p>
      </GlassCard>
    </motion.div>
  );
}

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
          Search everything
        </h3>
        <p className="font-body text-[12.5px] text-txt-muted leading-relaxed">
          Find places, people, pins, and events all in one search.
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
  const userResults  = useSelector((s) => s.users.searchResults);
  const pinResults   = useSelector((s) => s.pins.searchResults);
  const eventResults = useSelector((s) => s.events.searchResults);

  const [query,        setQuery]        = useState('');
  const [activeTab,    setActiveTab]    = useState('all');
  const [placeResults, setPlaceResults] = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState(null);
  const [hasSearched,  setHasSearched]  = useState(false);
  const [recent,       setRecent]       = useState(loadRecent);

  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  // ── Auto-focus after entrance ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      dispatch(clearSearch());
      dispatch(clearPinSearch());
      dispatch(clearEventSearch());
    };
  }, [dispatch]);

  // ── Debounced parallel search ───────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);

    if (query.trim().length < MIN_QUERY_LEN) {
      setPlaceResults([]);
      setHasSearched(false);
      setError(null);
      setIsLoading(false);
      dispatch(clearSearch());
      dispatch(clearPinSearch());
      dispatch(clearEventSearch());
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      const trimmed = query.trim();

      try {
        // Fire all 4 searches in parallel
        const [placesRes] = await Promise.allSettled([
          geocodeApi.search(trimmed),
          dispatch(searchUsers(trimmed)),
          dispatch(searchPins(trimmed)),
          dispatch(searchEvents(trimmed)),
        ]);

        // Only places come back from the API call; users/pins/events go to Redux
        if (placesRes.status === 'fulfilled') {
          const data = placesRes.value?.data;
          setPlaceResults(Array.isArray(data) ? data : []);
        } else {
          setPlaceResults([]);
        }

        setHasSearched(true);
      } catch {
        setError('Search failed. Check your connection and try again.');
        setPlaceResults([]);
        setHasSearched(false);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query, dispatch]);

  // ── Compute total counts per category ───────────────────────────────────────
  const counts = useMemo(() => ({
    places: placeResults.length,
    users:  (userResults || []).length,
    pins:   (pinResults || []).length,
    events: (eventResults || []).length,
  }), [placeResults, userResults, pinResults, eventResults]);

  const totalCount = counts.places + counts.users + counts.pins + counts.events;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => dispatch(closePanel()), [dispatch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setActiveTab('all');
    inputRef.current?.focus();
  }, []);

  const handleSelectPlace = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    navigate('/');
    dispatch(flyToLocation({ lat, lng, zoom: 15 }));
    setRecent((prev) => {
      const updated = prependRecent({ ...result, _type: 'place' }, prev);
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
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectUser = useCallback((user) => {
    navigate(`/profile/${user._id}`);
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectPin = useCallback((pin) => {
    const [lng, lat] = pin.location?.coordinates || [];
    if (lat != null && lng != null) {
      navigate('/');
      dispatch(flyToLocation({ lat, lng, zoom: 17 }));
    }
    dispatch(setSelectedPin(pin));
    dispatch(openModal({ type: 'pinDetail', data: { pinId: pin._id } }));
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectEvent = useCallback((event) => {
    const [lng, lat] = event.location?.coordinates || [];
    if (lat != null && lng != null) {
      navigate('/');
      dispatch(flyToLocation({ lat, lng, zoom: 17 }));
    }
    dispatch(setSelectedEvent(event));
    dispatch(openModal({ type: 'eventDetail', data: { eventId: event._id } }));
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleClearRecent = useCallback(() => {
    setRecent([]);
    persistRecent([]);
  }, []);

  // Focus ring on input wrapper
  const focusRing = () => {
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

  // ── Active view ─────────────────────────────────────────────────────────────

  const activeView = (() => {
    if (isLoading)                          return 'loading';
    if (hasSearched && totalCount > 0)      return 'results';
    if (hasSearched)                        return 'no-results';
    if (recent.length)                      return 'recent';
    return 'empty';
  })();

  // ── Responsive layout ───────────────────────────────────────────────────────

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col overflow-hidden glass'
    : 'fixed top-16 bottom-0 right-0 w-[400px] z-20 flex flex-col overflow-hidden glass border-l border-[var(--glass-border)]';

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

  // ── Render results for a given tab ──────────────────────────────────────────

  function renderResults() {
    const showPlaces = activeTab === 'all' || activeTab === 'places';
    const showUsers  = activeTab === 'all' || activeTab === 'users';
    const showPins   = activeTab === 'all' || activeTab === 'pins';
    const showEvents = activeTab === 'all' || activeTab === 'events';

    const isAll = activeTab === 'all';

    // For specific tab with no results
    if (!isAll) {
      const tabCount = counts[activeTab] || 0;
      if (tabCount === 0) {
        return <ViewNoResults query={query.trim()} />;
      }
    }

    return (
      <motion.div
        key={`results-${activeTab}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Places */}
        {showPlaces && placeResults.length > 0 && (
          <>
            {isAll && (
              <SectionHeader
                icon={<IconMapPin className="w-[12px] h-[12px]" />}
                label="Places"
                count={counts.places}
                color="#3b82f6"
              />
            )}
            <div className="flex flex-col gap-1.5">
              {(isAll ? placeResults.slice(0, 3) : placeResults).map((r, i) => (
                <PlaceCard
                  key={r.place_id ?? i}
                  result={r}
                  onSelect={() => handleSelectPlace(r)}
                  onSetDestination={() => handleSetDestination(r)}
                  index={i}
                />
              ))}
            </div>
            {isAll && placeResults.length > 3 && (
              <button
                onClick={() => setActiveTab('places')}
                className="font-body text-[12px] text-accent-primary hover:underline mt-1.5 mb-1 px-1"
              >
                Show all {placeResults.length} places
              </button>
            )}
          </>
        )}

        {/* Users */}
        {showUsers && (userResults || []).length > 0 && (
          <>
            {isAll && (
              <SectionHeader
                icon={<IconUser className="w-[12px] h-[12px]" />}
                label="Users"
                count={counts.users}
                color="#8b5cf6"
              />
            )}
            <div className="flex flex-col gap-1.5">
              {(isAll ? (userResults || []).slice(0, 3) : (userResults || [])).map((u, i) => (
                <UserCard
                  key={u._id}
                  user={u}
                  onClick={() => handleSelectUser(u)}
                  index={i}
                />
              ))}
            </div>
            {isAll && (userResults || []).length > 3 && (
              <button
                onClick={() => setActiveTab('users')}
                className="font-body text-[12px] text-accent-primary hover:underline mt-1.5 mb-1 px-1"
              >
                Show all {(userResults || []).length} users
              </button>
            )}
          </>
        )}

        {/* Pins */}
        {showPins && (pinResults || []).length > 0 && (
          <>
            {isAll && (
              <SectionHeader
                icon={<IconPin className="w-[12px] h-[12px]" />}
                label="Pins"
                count={counts.pins}
                color="#10b981"
              />
            )}
            <div className="flex flex-col gap-1.5">
              {(isAll ? (pinResults || []).slice(0, 3) : (pinResults || [])).map((p, i) => (
                <PinCard
                  key={p._id}
                  pin={p}
                  onClick={() => handleSelectPin(p)}
                  index={i}
                />
              ))}
            </div>
            {isAll && (pinResults || []).length > 3 && (
              <button
                onClick={() => setActiveTab('pins')}
                className="font-body text-[12px] text-accent-primary hover:underline mt-1.5 mb-1 px-1"
              >
                Show all {(pinResults || []).length} pins
              </button>
            )}
          </>
        )}

        {/* Events */}
        {showEvents && (eventResults || []).length > 0 && (
          <>
            {isAll && (
              <SectionHeader
                icon={<IconCalendar className="w-[12px] h-[12px]" />}
                label="Events"
                count={counts.events}
                color="#f59e0b"
              />
            )}
            <div className="flex flex-col gap-1.5">
              {(isAll ? (eventResults || []).slice(0, 3) : (eventResults || [])).map((e, i) => (
                <EventCard
                  key={e._id}
                  event={e}
                  onClick={() => handleSelectEvent(e)}
                  index={i}
                />
              ))}
            </div>
            {isAll && (eventResults || []).length > 3 && (
              <button
                onClick={() => setActiveTab('events')}
                className="font-body text-[12px] text-accent-primary hover:underline mt-1.5 mb-1 px-1"
              >
                Show all {(eventResults || []).length} events
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.aside
      key="search-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      {...motionProps}
      className={panelClass}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-surface-divider">
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
                     hover:text-txt-primary hover:bg-surface-hover transition-all duration-150
                     border border-[var(--glass-border)]"
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
            background:           'var(--glass-bg)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:               '1px solid var(--glass-border)',
          }}
        >
          <span className="absolute left-[13px] flex text-txt-muted pointer-events-none">
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
            placeholder="Search places, people, pins, events..."
            aria-label="Search"
            className="w-full bg-transparent border-none outline-none font-body text-sm
                       text-txt-primary placeholder:text-txt-muted"
            style={{ padding: '13px 44px 13px 42px', caretColor: '#3b82f6' }}
          />
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

      {/* ── Tab bar (only shown when we have results) ────────────────────────── */}
      {hasSearched && totalCount > 0 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabCount = tab.id === 'all' ? totalCount : (counts[tab.id] || 0);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex-1 font-body text-[11.5px] font-semibold py-[7px] px-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover',
                  ].join(' ')}
                >
                  {tab.label}
                  {tabCount > 0 && (
                    <span className={[
                      'ml-1 text-[10px] font-bold',
                      isActive ? 'text-accent-primary/70' : 'text-txt-muted/60',
                    ].join(' ')}>
                      {tabCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

          {activeView === 'loading' && <ViewLoading key="loading" />}

          {activeView === 'results' && (
            <div key="results">
              <p className="font-body text-[11.5px] text-txt-muted mb-2.5" aria-live="polite">
                {totalCount} result{totalCount !== 1 ? 's' : ''} found
              </p>
              {renderResults()}
            </div>
          )}

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
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-txt-muted flex"><IconClock className="w-[13px] h-[13px]" /></span>
                  <span className="font-body text-[11px] font-bold text-txt-muted uppercase tracking-[0.07em]">Recent</span>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="font-body text-[12px] text-txt-muted hover:text-txt-secondary
                             transition-colors duration-150 px-1.5 py-0.5 rounded-md hover:bg-surface-hover"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {recent.map((r, i) => {
                  // Recent items can be any type
                  if (r._type === 'place' || r.place_id) {
                    return (
                      <PlaceCard
                        key={r.place_id ?? i}
                        result={r}
                        onSelect={() => handleSelectPlace(r)}
                        onSetDestination={() => handleSetDestination(r)}
                        index={i}
                        isRecent
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </motion.div>
          )}

          {activeView === 'empty' && <ViewEmpty key="empty" />}

        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
