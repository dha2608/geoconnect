/**
 * EventDetailPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Sliding right-side panel for viewing a single event's full details.
 * Renders only when state.ui.modalOpen === 'eventDetail'.
 *
 * Features
 *  • Fetches event via fetchEvent(eventId) if not already in selectedEvent
 *  • Cover image (full-width) with gradient overlay, or category emoji placeholder
 *  • Title, category badge, start/end times, address
 *  • Organizer card (Avatar + name)
 *  • RSVP button — toggles attendance; disabled if event ended or at capacity
 *  • Organizer controls — Edit / Delete (stubs, wired to dispatch)
 *  • Attendee capacity progress bar + avatar row (first 8 + "+N more")
 *  • "Event ended" badge when endTime < now
 *  • Spring slide-in from right via Framer Motion
 *  • Backdrop click closes the panel
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';

import Avatar        from '../ui/Avatar';
import Badge         from '../ui/Badge';
import Button        from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

import {
  fetchEvent,
  toggleRsvp,
  clearSelectedEvent,
} from '../../features/events/eventSlice';
import { closeModal } from '../../features/ui/uiSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'meetup', label: 'Meetup', color: '#3b82f6', emoji: '🤝' },
  { value: 'party',  label: 'Party',  color: '#8b5cf6', emoji: '🎉' },
  { value: 'sports', label: 'Sports', color: '#10b981', emoji: '⚽' },
  { value: 'music',  label: 'Music',  color: '#ec4899', emoji: '🎵' },
  { value: 'food',   label: 'Food',   color: '#f59e0b', emoji: '🍕' },
  { value: 'other',  label: 'Other',  color: '#06b6d4', emoji: '📅' },
];

function getCat(value) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES[5];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-2">
      {children}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetailPanel() {
  const dispatch = useDispatch();

  const modalOpen    = useSelector((s) => s.ui.modalOpen);
  const modalData    = useSelector((s) => s.ui.modalData);
  const { isMobile } = useSelector((s) => s.ui);
  const event        = useSelector((s) => s.events.selectedEvent);
  const { loading }  = useSelector((s) => s.events);
  const currentUser  = useSelector((s) => s.auth.user);

  const isOpen  = modalOpen === 'eventDetail';
  const eventId = modalData?.eventId;

  // ── Fetch event if not already loaded ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && eventId && event?._id !== eventId) {
      dispatch(fetchEvent(eventId));
    }
  }, [isOpen, eventId, event?._id, dispatch]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const cat           = event ? getCat(event.category) : null;
  const attendees     = event?.attendees ?? [];
  const attendeeCount = attendees.length;
  const capacity      = event?.maxCapacity ?? 0;
  const isFull        = capacity > 0 && attendeeCount >= capacity;
  const capacityPct   = capacity > 0 ? Math.min((attendeeCount / capacity) * 100, 100) : 0;

  const myId       = currentUser?._id;
  const isAttending = attendees.some((a) => (a._id ?? a) === myId);
  const isOrganizer = myId && (event?.organizer?._id === myId || event?.organizer === myId);

  const eventEnded   = event?.endTime  && isPast(new Date(event.endTime));
  const eventStarted = event?.startTime && isPast(new Date(event.startTime));

  const visibleAttendees = attendees.slice(0, 8);
  const extraAttendees   = Math.max(0, attendeeCount - 8);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClose = () => {
    dispatch(clearSelectedEvent());
    dispatch(closeModal());
  };

  const handleRsvp = async () => {
    if (!event) return;
    try {
      await dispatch(toggleRsvp(event._id)).unwrap();
      toast.success(isAttending ? 'RSVP cancelled' : "You're going! 🎉");
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update RSVP');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ────────────────────────────────────────────────── */}
          <motion.div
            key="edp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* ── Panel ───────────────────────────────────────────────────── */}
          <motion.aside
            key="edp-panel"
            role="dialog"
            aria-modal="true"
            aria-label={event?.title ?? 'Event details'}
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0,      opacity: 1   }}
            exit={{    x: '100%', opacity: 0   }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className={`fixed right-0 z-50 flex flex-col bg-[#0f1520] border-l border-[rgba(59,130,246,0.12)] ${
              isMobile
                ? 'top-16 bottom-16 left-0 border-l-0'
                : 'top-0 h-full w-full max-w-[480px]'
            }`}
            style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.45)' }}
          >

            {/* ── Loading ───────────────────────────────────────────────── */}
            {loading && !event && (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* ── Error / not found ─────────────────────────────────────── */}
            {!loading && !event && isOpen && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="text-5xl">😕</span>
                <p className="text-slate-400 text-sm">Event not found or failed to load.</p>
                <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
              </div>
            )}

            {/* ── Event content ─────────────────────────────────────────── */}
            {event && cat && (
              <>
                {/* ── Hero: cover image or category placeholder ───────── */}
                <div className="relative flex-shrink-0">
                  {event.coverImage ? (
                    <div className="h-52">
                      <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient fade into panel background */}
                      <div className="absolute inset-0 bg-gradient-to-t
                                      from-[#0f1520] via-[#0f1520]/30 to-transparent" />
                    </div>
                  ) : (
                    <div
                      className="h-32 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}08)` }}
                    >
                      <span className="text-7xl drop-shadow-lg">{cat.emoji}</span>
                    </div>
                  )}

                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    aria-label="Close panel"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full
                               bg-black/55 backdrop-blur-md border border-white/10
                               text-white/70 hover:text-white hover:bg-black/75
                               flex items-center justify-center text-lg leading-none
                               transition-all duration-150"
                  >
                    ×
                  </button>

                  {/* Event-ended badge */}
                  {eventEnded && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="red">Ended</Badge>
                    </div>
                  )}

                  {/* Live badge */}
                  {!eventEnded && eventStarted && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5
                                    px-2.5 py-1 rounded-full text-xs font-semibold
                                    bg-green-500/20 text-green-400 border border-green-500/30
                                    backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Live now
                    </div>
                  )}
                </div>

                {/* ── Scrollable body ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-5 space-y-6">

                    {/* ── Title + Category ──────────────────────────────── */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-xl font-bold text-slate-100 font-[Syne] leading-snug">
                          {event.title}
                        </h2>
                        {/* Category pill */}
                        <span
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1
                                     rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color,
                                   border: `1px solid ${cat.color}40` }}
                        >
                          {cat.emoji} {cat.label}
                        </span>
                      </div>

                      {/* Times */}
                      <div className="mt-2.5 space-y-1">
                        {event.startTime && (
                          <p className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="text-slate-600">🗓</span>
                            {format(new Date(event.startTime), 'EEEE, MMMM d · h:mm a')}
                            {event.endTime && (
                              <span className="text-slate-600">
                                → {format(new Date(event.endTime), 'h:mm a')}
                              </span>
                            )}
                          </p>
                        )}
                        {event.startTime && !eventEnded && (
                          <p className="text-xs text-slate-600 pl-6">
                            {isFuture(new Date(event.startTime))
                              ? `Starts ${formatDistanceToNow(new Date(event.startTime), { addSuffix: true })}`
                              : 'Currently happening 🔥'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Organizer ─────────────────────────────────────── */}
                    {event.organizer && (
                      <div>
                        <SectionLabel>Organized by</SectionLabel>
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl
                                        bg-[rgba(15,21,32,0.7)] border border-[rgba(59,130,246,0.08)]">
                          <Avatar
                            src={event.organizer.avatar}
                            name={event.organizer.displayName ?? event.organizer.username ?? '?'}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">
                              {event.organizer.displayName ?? event.organizer.username}
                            </p>
                            {event.organizer.username && event.organizer.displayName && (
                              <p className="text-xs text-slate-600 truncate">
                                @{event.organizer.username}
                              </p>
                            )}
                          </div>
                          {isOrganizer && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full
                                             bg-blue-500/15 text-blue-400 font-semibold flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Description ───────────────────────────────────── */}
                    {event.description && (
                      <div>
                        <SectionLabel>About this event</SectionLabel>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {event.description}
                        </p>
                      </div>
                    )}

                    {/* ── Address ───────────────────────────────────────── */}
                    {event.address && (
                      <div className="flex items-start gap-2.5 text-sm text-slate-400">
                        <span className="text-base mt-0.5 flex-shrink-0">📍</span>
                        <span>{event.address}</span>
                      </div>
                    )}

                    {/* ── Attendees + capacity ──────────────────────────── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <SectionLabel>Attendees</SectionLabel>
                        <span className="text-xs text-slate-500">
                          {attendeeCount}
                          {capacity > 0 ? ` / ${capacity}` : ''} going
                          {isFull && (
                            <span className="ml-1.5 text-yellow-400 font-medium">· Full</span>
                          )}
                        </span>
                      </div>

                      {/* Capacity progress bar */}
                      {capacity > 0 && (
                        <div className="h-1.5 rounded-full bg-[rgba(59,130,246,0.08)] overflow-hidden mb-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${capacityPct}%` }}
                            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full"
                            style={{
                              background: capacityPct >= 90
                                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                            }}
                          />
                        </div>
                      )}

                      {/* Avatar row */}
                      {visibleAttendees.length > 0 ? (
                        <div className="flex items-center">
                          {visibleAttendees.map((attendee, i) => (
                            <div
                              key={attendee._id ?? i}
                              className="first:ml-0 -ml-2"
                              title={attendee.displayName ?? attendee.username}
                            >
                              <Avatar
                                src={attendee.avatar}
                                name={attendee.displayName ?? attendee.username ?? '?'}
                                size="xs"
                                className="ring-2 ring-[#0f1520]"
                              />
                            </div>
                          ))}
                          {extraAttendees > 0 && (
                            <div className="-ml-2 w-7 h-7 rounded-full flex-shrink-0
                                            bg-[rgba(59,130,246,0.15)] ring-2 ring-[#0f1520]
                                            flex items-center justify-center text-[10px]
                                            font-bold text-blue-400">
                              +{extraAttendees}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 italic">No attendees yet — be the first!</p>
                      )}
                    </div>

                    {/* ── Visibility ────────────────────────────────────── */}
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      {event.isPublic
                        ? <><span>🌍</span> Public event — anyone can join</>
                        : <><span>🔒</span> Private event</>}
                    </p>

                  </div>
                </div>

                {/* ── Footer actions ───────────────────────────────────── */}
                <div className="flex-shrink-0 p-4 border-t border-[rgba(59,130,246,0.08)]
                                bg-[rgba(9,14,23,0.85)] backdrop-blur-sm">
                  {isOrganizer ? (
                    /* Organizer: Edit + Delete */
                    <div className="flex gap-2">
                      <Button variant="outline" size="md" className="flex-1 gap-1.5">
                        ✏️ Edit Event
                      </Button>
                      <Button variant="danger" size="md" className="flex-1 gap-1.5">
                        🗑 Delete
                      </Button>
                    </div>
                  ) : eventEnded ? (
                    /* Event over */
                    <div className="text-center py-1.5 text-sm text-slate-600 font-medium">
                      This event has ended
                    </div>
                  ) : (
                    /* Attendee RSVP */
                    <Button
                      variant={isAttending ? 'secondary' : 'primary'}
                      size="lg"
                      className="w-full"
                      onClick={handleRsvp}
                      disabled={loading || (isFull && !isAttending)}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full"
                          />
                          Updating…
                        </span>
                      ) : isAttending ? (
                        '✓ Going · Cancel RSVP'
                      ) : isFull ? (
                        'Event Full'
                      ) : (
                        `${cat.emoji} RSVP · I'm Going!`
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
