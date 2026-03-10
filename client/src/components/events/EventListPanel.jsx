/**
 * EventListPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Side panel listing events near the current map viewport.
 * Renders only when state.ui.activePanel === 'events'.
 *
 * Layout
 *   • Slides in from the left, positioned after the sidebar (left-[72px])
 *   • Width 380 px, full viewport height
 *   • Glass-morphism: 20px blur, rgba(15,21,32,0.72) bg, blue-tinted border
 *
 * Features
 *   • Three tabs: Upcoming · Nearby · My Events
 *   • Staggered event card list with spring animation
 *   • Loading skeleton (4 placeholder cards)
 *   • Empty state per tab
 *   • Event card: category emoji dot, title, date/time, attendees, address
 *   • Click card → openModal({ type: 'eventDetail', data: { eventId } })
 *   • "Create Event" button → openModal({ type: 'createEvent' })
 *   • Fetches viewport events when panel opens (uses state.map.viewport)
 */

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, isFuture } from 'date-fns';

import Button        from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

import { fetchViewportEvents }    from '../../features/events/eventSlice';
import { openModal, closePanel }  from '../../features/ui/uiSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'meetup', label: 'Meetup', color: '#3b82f6', emoji: '🤝' },
  { value: 'party',  label: 'Party',  color: '#8b5cf6', emoji: '🎉' },
  { value: 'sports', label: 'Sports', color: '#10b981', emoji: '⚽' },
  { value: 'music',  label: 'Music',  color: '#ec4899', emoji: '🎵' },
  { value: 'food',   label: 'Food',   color: '#f59e0b', emoji: '🍕' },
  { value: 'other',  label: 'Other',  color: '#06b6d4', emoji: '📅' },
];

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'nearby',   label: 'Nearby'   },
  { id: 'mine',     label: 'My Events'},
];

function getCat(value) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES[5];
}

// ─── Animation variants ───────────────────────────────────────────────────────

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 14, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1    },
};

// ─── Event card skeleton ──────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-[rgba(59,130,246,0.07)]
                    bg-[rgba(13,17,23,0.5)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[rgba(59,130,246,0.08)] flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 bg-[rgba(59,130,246,0.08)] rounded-md w-3/4" />
          <div className="h-2.5 bg-[rgba(59,130,246,0.05)] rounded-md w-1/2" />
          <div className="h-2.5 bg-[rgba(59,130,246,0.05)] rounded-md w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onClick }) {
  const cat      = getCat(event.category);
  const ended    = event.endTime  && isPast(new Date(event.endTime));
  const started  = event.startTime && isPast(new Date(event.startTime));
  const count    = event.attendees?.length ?? 0;
  const capacity = event.maxCapacity ?? 0;
  const isFull   = capacity > 0 && count >= capacity;

  return (
    <motion.article
      variants={cardVariants}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      whileHover={{ scale: 1.012, y: -1 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl overflow-hidden
                 border border-[rgba(59,130,246,0.09)]
                 bg-[rgba(13,17,23,0.55)]
                 hover:border-[rgba(59,130,246,0.22)]
                 hover:bg-[rgba(15,21,32,0.75)]
                 backdrop-blur-sm
                 transition-colors duration-200"
    >
      {/* Category colour accent bar on the left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ backgroundColor: cat.color }}
      />

      <div className="flex items-start gap-3 p-4 pl-[18px]">
        {/* Category icon bubble */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center
                     text-lg flex-shrink-0 select-none"
          style={{ backgroundColor: `${cat.color}22` }}
        >
          {cat.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="text-[13px] font-semibold text-slate-200 font-[Syne] truncate leading-snug">
              {event.title}
            </h3>
            {/* Status badge */}
            {ended ? (
              <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full
                               font-semibold bg-slate-700/40 text-slate-600 uppercase tracking-wide">
                Ended
              </span>
            ) : started ? (
              <span className="flex-shrink-0 flex items-center gap-1 text-[9px] px-1.5 py-0.5
                               rounded-full font-semibold bg-green-500/15 text-green-400
                               uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            ) : null}
          </div>

          {/* Date / time */}
          {event.startTime && (
            <p className="text-[11px] text-slate-500 mb-1">
              {format(new Date(event.startTime), 'EEE, MMM d · h:mm a')}
            </p>
          )}

          {/* Address snippet */}
          {event.address && (
            <p className="text-[11px] text-slate-600 truncate mb-1.5">
              📍 {event.address}
            </p>
          )}

          {/* Footer row: attendees + capacity */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-600">
              👥 {count} {count === 1 ? 'person' : 'people'} going
            </span>
            {isFull && (
              <span className="text-[10px] text-yellow-500/80 font-semibold">· Full</span>
            )}
            {capacity > 0 && !isFull && (
              <span className="text-[11px] text-slate-700">· {capacity - count} spots left</span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_STATES = {
  upcoming: { emoji: '🗓', title: 'No upcoming events', body: 'Create one and invite your friends!' },
  nearby:   { emoji: '📍', title: 'No events nearby',   body: 'Move the map or zoom out to see more.' },
  mine:     { emoji: '✨', title: 'No events yet',       body: "Events you create or RSVP to will appear here." },
};

function EmptyState({ tab }) {
  const { emoji, title, body } = EMPTY_STATES[tab] ?? EMPTY_STATES.upcoming;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center mb-4">
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="text-txt-primary font-heading font-semibold text-sm mb-1">{title}</p>
      <p className="text-txt-muted text-xs max-w-[220px] leading-relaxed">{body}</p>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventListPanel() {
  const dispatch = useDispatch();

  const activePanel = useSelector((s) => s.ui.activePanel);
  const { isMobile } = useSelector((s) => s.ui);
  const { events, loading } = useSelector((s) => s.events);
  const viewport    = useSelector((s) => s.map.viewport);      // { north,south,east,west }
  const currentUser = useSelector((s) => s.auth?.user);

  const [activeTab, setActiveTab] = useState('upcoming');

  const isVisible = activePanel === 'events';

  // Fetch events when panel opens (or viewport changes while open)
  useEffect(() => {
    if (isVisible && viewport) {
      // Convert Redux viewport {north,south,east,west} → server format {swLat,swLng,neLat,neLng}
      const serverBounds = {
        swLat: viewport.south,
        swLng: viewport.west,
        neLat: viewport.north,
        neLng: viewport.east,
      };
      dispatch(fetchViewportEvents(serverBounds));
    }
  }, [isVisible, viewport, dispatch]);

  // Reset to Upcoming tab each time the panel opens
  useEffect(() => {
    if (isVisible) setActiveTab('upcoming');
  }, [isVisible]);

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const now = new Date();

  const filteredEvents = (() => {
    const myId = currentUser?._id;

    switch (activeTab) {
      case 'upcoming':
        return [...events]
          .filter((e) => !e.endTime || new Date(e.endTime) > now)
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      case 'nearby':
        // All non-ended events; spatial sorting happens server-side via viewport fetch
        return events.filter((e) => !e.endTime || new Date(e.endTime) > now);

      case 'mine':
        if (!myId) return [];
        return events.filter(
          (e) =>
            e.organizer?._id === myId ||
            e.organizer      === myId ||
            e.attendees?.some((a) => (a._id ?? a) === myId),
        );

      default:
        return events;
    }
  })();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => dispatch(closePanel()), [dispatch]);

  const handleCreateEvent = useCallback(
    () => dispatch(openModal({ type: 'createEvent', data: {} })),
    [dispatch],
  );

  const handleEventClick = useCallback(
    (event) => dispatch(openModal({ type: 'eventDetail', data: { eventId: event._id } })),
    [dispatch],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col bg-[rgba(15,21,32,0.72)] backdrop-blur-[20px] saturate-[180%]'
    : 'fixed left-[72px] top-0 h-full w-[380px] z-30 flex flex-col bg-[rgba(15,21,32,0.72)] backdrop-blur-[20px] saturate-[180%] border-r border-[rgba(59,130,246,0.12)]';

  const motionProps = isMobile
    ? {
        initial:    { opacity: 0, y: 20 },
        animate:    { opacity: 1, y: 0  },
        exit:       { opacity: 0, y: 20 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial:    { x: -380 },
        animate:    { x: 0    },
        exit:       { x: -380 },
        transition: { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 },
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          key="event-list-panel"
          role="complementary"
          aria-label="Events list"
          {...motionProps}
          className={panelClass}
          style={{ boxShadow: '6px 0 32px rgba(0,0,0,0.35)' }}
        >

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pt-5 pb-3
                          border-b border-[rgba(59,130,246,0.08)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100 font-[Syne] tracking-tight">
                Events
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateEvent}
                  className="gap-1"
                >
                  <span className="text-base leading-none">+</span>
                  Create
                </Button>
                <button
                  onClick={handleClose}
                  aria-label="Close events panel"
                  className="w-8 h-8 rounded-full flex items-center justify-center
                             text-slate-500 hover:text-slate-300 text-xl leading-none
                             hover:bg-[rgba(59,130,246,0.08)] transition-all duration-150"
                >
                  ×
                </button>
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 rounded-xl
                            bg-[rgba(9,14,23,0.6)] border border-[rgba(59,130,246,0.07)]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-slate-600 hover:text-slate-400',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Event count line ────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {!loading && filteredEvents.length > 0 && (
              <motion.div
                key={`count-${activeTab}-${filteredEvents.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-shrink-0 px-4 pt-2.5 pb-0"
              >
                <p className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── List area ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-4 pt-2">

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-2.5 pt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredEvents.length === 0 && (
              <EmptyState tab={activeTab} />
            )}

            {/* Event cards */}
            {!loading && filteredEvents.length > 0 && (
              <motion.div
                key={`list-${activeTab}`}
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                  />
                ))}
              </motion.div>
            )}
          </div>

        </motion.aside>
      )}
    </AnimatePresence>
  );
}
