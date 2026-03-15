/**
 * SearchCards.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Result card components for the SearchPanel.
 * Includes: TypeBadge, SectionHeader, PlaceCard, UserCard, PinCard, EventCard.
 *
 * Constants required by the cards (PIN_CATEGORY_COLORS, TYPE_META, etc.) are
 * co-located here so the cards are fully self-contained.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  IconClock,
  IconMapPin,
  IconNavDest,
  IconChevronRight,
  IconUser,
  IconPin,
  IconCalendar,
} from './SearchIcons';

// ─── Category / type metadata ─────────────────────────────────────────────────

export const CATEGORY_META = {
  places: { color: '#3b82f6', label: 'Place' },
  users:  { color: '#8b5cf6', label: 'User' },
  pins:   { color: '#10b981', label: 'Pin' },
  events: { color: '#f59e0b', label: 'Event' },
};

export const PIN_CATEGORY_COLORS = {
  food:   '#f97316',
  nature: '#22c55e',
  art:    '#ec4899',
  event:  '#f59e0b',
  other:  '#64748b',
};

// ─── Nominatim type → display metadata ────────────────────────────────────────

const TYPE_META = {
  city:           { label: 'City',          color: '#3b82f6' },
  town:           { label: 'Town',          color: '#06b6d4' },
  village:        { label: 'Village',       color: '#10b981' },
  hamlet:         { label: 'Hamlet',        color: '#10b981' },
  suburb:         { label: 'Suburb',        color: '#8b5cf6' },
  neighbourhood:  { label: 'Neighbourhood', color: '#ec4899' },
  road:           { label: 'Road',          color: '#f59e0b' },
  residential:    { label: 'Area',          color: '#f97316' },
  country:        { label: 'Country',       color: '#ef4444' },
  state:          { label: 'State',         color: '#6366f1' },
  county:         { label: 'County',        color: '#84cc16' },
  administrative: { label: 'Region',        color: '#a855f7' },
  postcode:       { label: 'Postcode',      color: '#64748b' },
  natural:        { label: 'Natural',       color: '#22c55e' },
  water:          { label: 'Water',         color: '#0ea5e9' },
  tourism:        { label: 'Tourism',       color: '#f43f5e' },
  amenity:        { label: 'Amenity',       color: '#fb923c' },
  building:       { label: 'Building',      color: '#94a3b8' },
};

export function resolveType(type, cls) {
  const info = TYPE_META[type] ?? TYPE_META[cls];
  if (info) return info;
  const raw = type ?? cls ?? 'place';
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), color: '#94a3b8' };
}

// ─── Type badge ───────────────────────────────────────────────────────────────

export function TypeBadge({ label, color }) {
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

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ icon, label, count, color }) {
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

// ─── Place result card ────────────────────────────────────────────────────────

export const PlaceCard = memo(function PlaceCard({ result, onSelect, onSetDestination, index, isRecent = false }) {
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
});

// ─── User result card ─────────────────────────────────────────────────────────

export const UserCard = memo(function UserCard({ user, onClick, index }) {
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
});

// ─── Pin result card ──────────────────────────────────────────────────────────

export const PinCard = memo(function PinCard({ pin, onClick, index }) {
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
});

// ─── Event result card ────────────────────────────────────────────────────────

export const EventCard = memo(function EventCard({ event, onClick, index }) {
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
});
