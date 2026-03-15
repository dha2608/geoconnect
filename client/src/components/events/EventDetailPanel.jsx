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

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';

import Avatar        from '../ui/Avatar';
import Badge         from '../ui/Badge';
import Button        from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import ImageLightbox from '../ui/ImageLightbox';

import {
  fetchEvent,
  toggleRsvp,
  deleteEvent,
  clearSelectedEvent,
  selectEventsLoading,
  fetchEventComments,
  addEventComment,
  editEventComment,
  deleteEventComment,
  likeEventComment,
  unlikeEventComment,
  clearEventComments,
  selectEventComments,
  selectCommentsLoading,
} from '../../features/events/eventSlice';
import { closeModal, openModal } from '../../features/ui/uiSlice';
import useRequireAuth from '../../hooks/useRequireAuth';

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
  const requireAuth = useRequireAuth();
  const [coverLightbox, setCoverLightbox] = useState(false);
  const [commentText, setCommentText]     = useState('');
  const [editingId, setEditingId]         = useState(null);
  const [editText, setEditText]           = useState('');

  const modalOpen    = useSelector((s) => s.ui.modalOpen);
  const modalData    = useSelector((s) => s.ui.modalData);
  const { isMobile } = useSelector((s) => s.ui);
  const event        = useSelector((s) => s.events.selectedEvent);
  const loading      = useSelector(selectEventsLoading);
  const currentUser  = useSelector((s) => s.auth.user);
  const comments     = useSelector(selectEventComments);
  const commentsLoading = useSelector(selectCommentsLoading);

  const isOpen  = modalOpen === 'eventDetail';
  const eventId = modalData?.eventId;

  // ── Fetch event if not already loaded ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && eventId && event?._id !== eventId) {
      dispatch(fetchEvent(eventId));
    }
  }, [isOpen, eventId, event?._id, dispatch]);

  // ── Fetch comments when event loads ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && event?._id) {
      dispatch(fetchEventComments(event._id));
    }
    return () => { dispatch(clearEventComments()); };
  }, [isOpen, event?._id, dispatch]);

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
    if (!requireAuth('RSVP to events')) return;
    if (!event) return;
    try {
      await dispatch(toggleRsvp({ id: event._id, userId: currentUser._id })).unwrap();
      toast.success(isAttending ? 'RSVP cancelled' : "You're going! 🎉");
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update RSVP');
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    const confirmed = window.confirm(
      `Delete "${event.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await dispatch(deleteEvent(event._id)).unwrap();
      toast.success('Event deleted');
      handleClose();
    } catch (err) {
      toast.error(err?.message ?? 'Failed to delete event');
    }
  };

  const handleEdit = () => {
    if (!event) return;
    dispatch(clearSelectedEvent());
    dispatch(openModal({ modal: 'createEvent', data: { editEvent: event } }));
  };

  // ── Comment handlers ────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!requireAuth('comment on events')) return;
    if (!commentText.trim() || !event) return;
    try {
      await dispatch(addEventComment({ eventId: event._id, text: commentText.trim() })).unwrap();
      setCommentText('');
    } catch (err) { toast.error(err?.message ?? 'Failed to add comment'); }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim() || !event) return;
    try {
      await dispatch(editEventComment({ eventId: event._id, commentId, text: editText.trim() })).unwrap();
      setEditingId(null);
      setEditText('');
    } catch (err) { toast.error(err?.message ?? 'Failed to edit comment'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!event) return;
    try {
      await dispatch(deleteEventComment({ eventId: event._id, commentId })).unwrap();
    } catch (err) { toast.error(err?.message ?? 'Failed to delete comment'); }
  };

  const handleLikeComment = async (comment) => {
    if (!requireAuth('like comments')) return;
    if (!event) return;
    const isLiked = comment.likes?.some((l) => (l._id ?? l) === myId);
    try {
      if (isLiked) {
        await dispatch(unlikeEventComment({ eventId: event._id, commentId: comment._id })).unwrap();
      } else {
        await dispatch(likeEventComment({ eventId: event._id, commentId: comment._id })).unwrap();
      }
    } catch (err) { toast.error(err?.message ?? 'Failed to update like'); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
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
            className={`fixed right-0 z-50 flex flex-col glass border-l border-[var(--glass-border)] ${
              isMobile
                ? 'top-16 bottom-16 left-0 border-l-0'
                : 'top-0 h-full w-full max-w-[480px]'
            }`}
            style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.45)' }}
          >

            {/* ── Loading skeleton ─────────────────────────────────────── */}
            {loading && !event && (
              <div className="flex-1 p-4 space-y-4">
                {/* Cover image placeholder */}
                <Skeleton variant="image" className="h-48 rounded-xl" />
                {/* Title + badge */}
                <div className="space-y-2">
                  <Skeleton variant="title" width="75%" height={24} />
                  <Skeleton variant="text" width="35%" height={14} />
                </div>
                {/* Date / address */}
                <div className="space-y-2 mt-4">
                  <Skeleton variant="text" width="60%" height={14} />
                  <Skeleton variant="text" width="50%" height={14} />
                </div>
                {/* Organizer */}
                <div className="flex items-center gap-3 mt-4">
                  <Skeleton variant="avatar" size={40} />
                  <Skeleton variant="text" width="30%" height={14} />
                </div>
                {/* Description lines */}
                <div className="space-y-2 mt-4">
                  <Skeleton variant="text" width="100%" height={13} />
                  <Skeleton variant="text" width="90%" height={13} />
                  <Skeleton variant="text" width="70%" height={13} />
                </div>
                {/* Attendees row */}
                <div className="flex gap-2 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} variant="avatar" size={32} />
                  ))}
                </div>
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
                    <div className="h-52 cursor-pointer" onClick={() => setCoverLightbox(true)}>
                      <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover hover:brightness-90 transition-[filter] duration-150"
                      />
                      {/* Gradient fade into panel background */}
                      <div className="absolute inset-0 bg-gradient-to-t
                                      from-[var(--glass-bg)] via-[var(--glass-bg)]/30 to-transparent pointer-events-none" />
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
                   bg-black/55 backdrop-blur-md border border-surface-divider
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
                        {/* Recurring badge */}
                        {(event.recurrence?.type && event.recurrence.type !== 'none') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                           text-[10px] font-semibold bg-purple-500/15 text-purple-400
                                           border border-purple-500/25 mr-2">
                            🔁 {event.recurrence.type}{event.recurrence.interval > 1 ? ` (every ${event.recurrence.interval})` : ''}
                          </span>
                        )}
                        {event.parentEvent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                           text-[10px] font-semibold bg-purple-500/15 text-purple-400
                                           border border-purple-500/25 mr-2">
                            🔁 Part of series
                          </span>
                        )}
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
                                        bg-[var(--glass-bg)] border border-[var(--glass-border)]">
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

                    {/* ── Tags ──────────────────────────────────────────── */}
                    {event.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {event.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full text-xs font-medium
                                       bg-blue-500/15 text-blue-300 border border-blue-500/20"
                          >
                            #{tag}
                          </span>
                        ))}
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
                        <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden mb-3">
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
                                className="ring-2 ring-[var(--glass-bg)]"
                              />
                            </div>
                          ))}
                          {extraAttendees > 0 && (
                            <div className="-ml-2 w-7 h-7 rounded-full flex-shrink-0
                                            bg-surface-hover ring-2 ring-[var(--glass-bg)]
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

                    {/* ── Comments / Discussion ────────────────────────── */}
                    <div>
                      <SectionLabel>Discussion ({event.commentCount ?? comments.length})</SectionLabel>

                      {/* Comment input */}
                      <div className="flex gap-2 mb-3">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                          placeholder="Join the discussion…"
                          maxLength={500}
                          className="flex-1 px-3 py-2 rounded-lg text-sm
                                     bg-[var(--glass-bg)] border border-[var(--glass-border)]
                                     text-slate-200 placeholder:text-slate-600
                                     focus:outline-none focus:border-blue-500/40 transition-colors"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!commentText.trim()}
                        >
                          Post
                        </Button>
                      </div>

                      {/* Comment list */}
                      {commentsLoading ? (
                        <div className="space-y-3 py-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Skeleton variant="avatar" size={28} />
                              <div className="flex-1 space-y-1">
                                <Skeleton variant="text" width="30%" height={12} />
                                <Skeleton variant="text" width={`${70 + (i % 3) * 10}%`} height={12} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : comments.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          <AnimatePresence>
                            {comments.map((c) => {
                              const isAuthor = myId && (c.user?._id ?? c.user) === myId;
                              const isLiked = c.likes?.some((l) => (l._id ?? l) === myId);
                              return (
                                <motion.div
                                  key={c._id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  className="group flex gap-2.5"
                                >
                                  <Avatar
                                    src={c.user?.avatar}
                                    name={c.user?.name ?? '?'}
                                    size="xs"
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-300 truncate">
                                        {c.user?.name ?? 'User'}
                                      </span>
                                      <span className="text-[10px] text-slate-600">
                                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                      </span>
                                      {c.isEdited && (
                                        <span className="text-[10px] text-slate-600 italic">edited</span>
                                      )}
                                    </div>

                                    {editingId === c._id ? (
                                      <div className="flex gap-1.5 mt-1">
                                        <input
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleEditComment(c._id);
                                            if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                                          }}
                                          className="flex-1 px-2 py-1 rounded text-xs
                                                     bg-[var(--glass-bg)] border border-blue-500/30
                                                     text-slate-200 focus:outline-none"
                                          maxLength={500}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleEditComment(c._id)}
                                          className="text-green-400 text-xs hover:underline"
                                        >Save</button>
                                        <button
                                          onClick={() => { setEditingId(null); setEditText(''); }}
                                          className="text-slate-500 text-xs hover:underline"
                                        >Cancel</button>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-400 mt-0.5 break-words">{c.text}</p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 mt-1">
                                      <button
                                        onClick={() => handleLikeComment(c)}
                                        className={`text-[10px] flex items-center gap-0.5 transition-colors
                                          ${isLiked ? 'text-red-400' : 'text-slate-600 hover:text-red-400'}`}
                                      >
                                        {isLiked ? '❤️' : '🤍'} {c.likes?.length || ''}
                                      </button>
                                      {isAuthor && editingId !== c._id && (
                                        <button
                                          onClick={() => { setEditingId(c._id); setEditText(c.text); }}
                                          className="text-[10px] text-slate-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >Edit</button>
                                      )}
                                      {(isAuthor || isOrganizer) && (
                                        <button
                                          onClick={() => handleDeleteComment(c._id)}
                                          className="text-[10px] text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >Delete</button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 italic text-center py-3">
                          No comments yet — start the discussion!
                        </p>
                      )}
                    </div>

                  </div>
                </div>

                {/* ── Footer actions ───────────────────────────────────── */}
                <div className="flex-shrink-0 p-4 border-t border-surface-divider
                                bg-[var(--glass-bg)] backdrop-blur-sm">
                  {isOrganizer ? (
                    /* Organizer: Edit + Delete */
                    <div className="flex gap-2">
                      <Button variant="outline" size="md" className="flex-1 gap-1.5" onClick={handleEdit}>
                        ✏️ Edit Event
                      </Button>
                      <Button variant="danger" size="md" className="flex-1 gap-1.5" onClick={handleDelete}>
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

      {event?.coverImage && (
        <ImageLightbox
          images={[event.coverImage]}
          initialIndex={0}
          isOpen={coverLightbox}
          onClose={() => setCoverLightbox(false)}
        />
      )}
    </>
  );
}
