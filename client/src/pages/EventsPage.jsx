/**
 * EventsPage.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Full-page events browser — standalone route at /events
 *
 * Features
 *   • Header with title + back navigation
 *   • Debounced search bar → searchEvents thunk
 *   • Category filter chips (horizontal scroll)
 *   • Tabs: Upcoming | Nearby | My Events | Search Results
 *   • Collapsible tag + date-range filters
 *   • Responsive event grid (3-col desktop → 2-col tablet → 1-col mobile)
 *   • Framer Motion animations throughout
 *   • "Create Event" FAB on mobile; header button on desktop
 *   • Empty states per tab with contextual CTAs
 */

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, isPast } from 'date-fns';

import GlassCard from '../components/ui/GlassCard';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

import {
  fetchViewportEvents,
  searchEvents,
  fetchPopularTags,
  fetchEventsByTag,
  setSelectedEvent,
  selectAllEvents,
  selectEventsLoading,
  selectEventsError,
  selectEventSearchResults,
  selectPopularTags,
  selectTagEvents,
  selectUpcomingEvents,
} from '../features/events/eventSlice';
import { openModal } from '../features/ui/uiSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'all',           label: 'All',           emoji: '✨' },
  { value: 'meetup',        label: 'Meetup',        emoji: '🤝', color: 'var(--accent-primary)' },
  { value: 'party',         label: 'Party',         emoji: '🎉', color: 'var(--accent-violet)' },
  { value: 'sports',        label: 'Sports',        emoji: '⚽', color: '#10b981' },
  { value: 'music',         label: 'Music',         emoji: '🎵', color: '#ec4899' },
  { value: 'food',          label: 'Food',          emoji: '🍕', color: '#f59e0b' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎭', color: '#a855f7' },
  { value: 'outdoors',      label: 'Outdoors',      emoji: '🏕️', color: '#22c55e' },
  { value: 'culture',       label: 'Culture',       emoji: '🏛️', color: '#eab308' },
  { value: 'other',         label: 'Other',         emoji: '📅', color: '#06b6d4' },
];

const ALL_TABS = [
  { id: 'upcoming', label: 'Upcoming',       icon: '📅' },
  { id: 'nearby',   label: 'Nearby',         icon: '📍' },
  { id: 'mine',     label: 'My Events',      icon: '👤' },
  { id: 'search',   label: 'Search Results', icon: '🔍' },
];

// Very wide bounds so we get a useful initial event set on mount
const WORLD_BOUNDS = { swLat: -90, swLng: -180, neLat: 90, neLng: 180 };

function getCat(value) {
  return (
    EVENT_CATEGORIES.find((c) => c.value === value) ??
    EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1]
  );
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
};

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
};

// ─── EventCardSkeleton ────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="glass rounded-2xl border border-surface-divider p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-surface-hover flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 bg-surface-hover rounded-md w-3/4" />
          <div className="h-2.5 bg-surface-hover rounded-md w-1/2" />
          <div className="h-2.5 bg-surface-hover rounded-md w-2/3" />
          <div className="flex gap-1.5 mt-1">
            <div className="h-4 w-12 bg-surface-hover rounded-full" />
            <div className="h-4 w-16 bg-surface-hover rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Full-page EventCard ──────────────────────────────────────────────────────

const EventCard = memo(function EventCard({ event, onClick }) {
  const cat      = getCat(event.category);
  const ended    = event.endTime   && isPast(new Date(event.endTime));
  const started  = event.startTime && isPast(new Date(event.startTime));
  const count    = event.attendees?.length ?? 0;
  const capacity = event.maxCapacity ?? 0;
  const isFull   = capacity > 0 && count >= capacity;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ scale: 1.014, y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="group relative cursor-pointer rounded-2xl overflow-hidden
                 border border-[var(--glass-border)] bg-[var(--glass-bg)]
                 hover:border-accent-violet/30 hover:bg-surface-active
                 backdrop-blur-sm transition-colors duration-200"
    >
      {/* Category colour accent bar on the left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ backgroundColor: cat.color ?? 'var(--accent-primary)' }}
      />

      <div className="p-4 pl-[18px]">
        <div className="flex items-start gap-3">
          {/* Icon bubble */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 select-none"
            style={{ backgroundColor: `color-mix(in srgb, ${cat.color ?? 'var(--accent-primary)'} 13%, transparent)` }}
          >
            {cat.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + live/ended badge */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-txt-primary leading-snug line-clamp-2 font-[Syne]">
                {event.title}
              </h3>
              {ended ? (
                <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold
                                 bg-surface-hover text-txt-muted uppercase tracking-wide">
                  Ended
                </span>
              ) : started ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[9px] px-1.5 py-0.5
                                 rounded-full font-semibold bg-accent-success/15 text-accent-success
                                 uppercase tracking-wide">
                  <span className="w-1 h-1 rounded-full bg-accent-success animate-pulse" />
                  Live
                </span>
              ) : null}
            </div>

            {/* Date / time */}
            {event.startTime && (
              <p className="text-xs text-txt-muted mb-1">
                🗓&nbsp;{format(new Date(event.startTime), 'EEE, MMM d · h:mm a')}
              </p>
            )}

            {/* Address */}
            {(event.address || event.location?.address) && (
              <p className="text-xs text-txt-muted truncate mb-1.5">
                📍&nbsp;{event.address || event.location?.address}
              </p>
            )}

            {/* Attendees + capacity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-txt-muted">
                👥&nbsp;{count} {count === 1 ? 'person' : 'people'} going
              </span>
              {isFull ? (
                <span className="text-[10px] text-yellow-500/80 font-semibold">· Full</span>
              ) : capacity > 0 ? (
                <span className="text-xs text-txt-muted">· {capacity - count} spots left</span>
              ) : null}
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {event.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded-full text-[10px]
                               bg-accent-violet/10 text-accent-violet/70 border border-accent-violet/15"
                  >
                    #{tag}
                  </span>
                ))}
                {event.tags.length > 4 && (
                  <span className="text-[10px] text-txt-muted">+{event.tags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
});

// ─── CategoryChip ─────────────────────────────────────────────────────────────

const CategoryChip = memo(function CategoryChip({ category, isActive, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={[
        'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        'transition-all duration-200 border',
        isActive
          ? 'bg-accent-violet/20 text-accent-violet border-accent-violet/40 shadow-sm'
          : 'glass text-txt-muted border-[var(--glass-border)] hover:text-txt-secondary hover:border-txt-muted/30',
      ].join(' ')}
    >
      <span>{category.emoji}</span>
      <span>{category.label}</span>
    </motion.button>
  );
});

// ─── Main EventsPage ──────────────────────────────────────────────────────────

export default function EventsPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  // Redux state
  const events        = useSelector(selectAllEvents);
  const upcomingEvts  = useSelector(selectUpcomingEvents);
  const loading       = useSelector(selectEventsLoading);
  const error         = useSelector(selectEventsError);
  const searchResults = useSelector(selectEventSearchResults);
  const popularTags   = useSelector(selectPopularTags);
  const currentUser   = useSelector((s) => s.auth?.user);

  // Local state
  const [activeTab,      setActiveTab]      = useState('upcoming');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [isSearching,    setIsSearching]    = useState(false);
  const [selectedTags,   setSelectedTags]   = useState([]);
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [showFilters,    setShowFilters]    = useState(false);

  const searchTimer = useRef(null);

  // ── Fetch initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchViewportEvents(WORLD_BOUNDS));
    dispatch(fetchPopularTags());
  }, [dispatch]);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const q = searchQuery.trim();
    if (!q) {
      setIsSearching(false);
      // Drop back to upcoming tab when search is cleared
      setActiveTab((prev) => (prev === 'search' ? 'upcoming' : prev));
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(() => {
      dispatch(searchEvents({ q })).finally(() => setIsSearching(false));
      setActiveTab('search');
    }, 400);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, dispatch]);

  // ── Filtered events (memoised) ─────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const now  = new Date();
    const myId = currentUser?._id;

    let result;
    switch (activeTab) {
      case 'upcoming':
        result = upcomingEvts
          .slice()
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        break;

      case 'nearby':
        // No viewport on this page — show all non-expired events
        result = events.filter((e) => !e.endTime || new Date(e.endTime) > now);
        break;

      case 'mine':
        if (!myId) return [];
        result = events.filter(
          (e) =>
            e.organizer?._id === myId ||
            e.organizer === myId ||
            e.attendees?.some((a) => (a._id ?? a) === myId),
        );
        break;

      case 'search':
        result = [...searchResults];
        break;

      default:
        result = [...events];
    }

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((e) => e.category === activeCategory);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((e) => e.tags?.some((t) => selectedTags.includes(t)));
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((e) => e.startTime && new Date(e.startTime) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => e.startTime && new Date(e.startTime) <= to);
    }

    return result;
  }, [
    activeTab,
    events,
    upcomingEvts,
    searchResults,
    activeCategory,
    selectedTags,
    dateFrom,
    dateTo,
    currentUser,
  ]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEventClick = useCallback(
    (event) => {
      dispatch(setSelectedEvent(event));
      dispatch(openModal({ type: 'eventDetail', data: { eventId: event._id } }));
    },
    [dispatch],
  );

  const handleCreateEvent = useCallback(
    () => dispatch(openModal({ type: 'createEvent', data: {} })),
    [dispatch],
  );

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setActiveCategory('all');
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  // Tabs — only show "Search Results" when there is a query
  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => t.id !== 'search' || searchQuery.trim()),
    [searchQuery],
  );

  const activeFilterCount =
    selectedTags.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (activeCategory !== 'all' ? 1 : 0);

  const activeCategoryLabel = EVENT_CATEGORIES.find((c) => c.value === activeCategory)?.label;

  // ── Empty-state per tab ────────────────────────────────────────────────────
  const emptyTitle = useMemo(() => {
    if (activeTab === 'search')  return `No results for "${searchQuery}"`;
    if (activeTab === 'mine')    return 'No events yet';
    if (activeFilterCount > 0)   return 'No matching events';
    return 'No events found';
  }, [activeTab, searchQuery, activeFilterCount]);

  const emptyDescription = useMemo(() => {
    if (activeTab === 'search')  return 'Try a different search term or clear the search.';
    if (activeTab === 'mine')    return 'Events you create or RSVP to will appear here.';
    if (activeFilterCount > 0)   return 'Adjust or clear your filters to see more events.';
    return 'No events in this area yet. Be the first to create one!';
  }, [activeTab, activeFilterCount]);

  const emptyAction = useMemo(() => {
    if (activeTab === 'search') return { label: 'Clear search', onClick: clearSearch };
    if (activeFilterCount > 0)  return { label: 'Clear filters', onClick: clearFilters };
    return { label: 'Create Event', onClick: handleCreateEvent };
  }, [activeTab, activeFilterCount, clearSearch, clearFilters, handleCreateEvent]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="h-full overflow-y-auto scrollbar-thin"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-24">

        {/* ── Hero header ───────────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants} className="relative overflow-hidden rounded-3xl glass border border-surface-divider p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="w-9 h-9 rounded-full glass border border-[var(--glass-border)]
                           flex items-center justify-center text-txt-muted
                           hover:text-txt-primary hover:bg-surface-hover transition-all duration-150 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-txt-primary font-[Syne]">
                  Events
                </h1>
                <p className="text-sm text-txt-muted mt-0.5">
                  Discover what's happening around you
                </p>
              </div>
            </div>

            {/* Desktop create button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCreateEvent}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-gradient-to-r from-accent-primary to-accent-violet text-white text-sm font-semibold
                         hover:opacity-90 transition-opacity shadow-lg shadow-accent-violet/20 flex-shrink-0"
            >
              <span className="text-lg leading-none">+</span>
              Create Event
            </motion.button>
          </div>
        </motion.div>

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants} className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            {isSearching ? (
              <svg className="w-4 h-4 text-accent-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name, tag, or location…"
            className="w-full pl-10 pr-10 py-3 rounded-2xl glass border border-[var(--glass-border)]
                       text-txt-primary text-sm placeholder:text-txt-muted
                       focus:outline-none focus:border-accent-primary/50 transition-colors"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearSearch}
                className="absolute inset-y-0 right-3 flex items-center text-txt-muted hover:text-txt-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Category filter chips ─────────────────────────────────────────── */}
        <motion.div variants={sectionVariants}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {EVENT_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.value}
                category={cat}
                isActive={activeCategory === cat.value}
                onClick={() => setActiveCategory(cat.value)}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants}>
          <div className="flex gap-1 p-1 rounded-2xl glass border border-[var(--glass-border)] w-fit max-w-full overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium',
                  'transition-all duration-200 whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-accent-violet/20 text-accent-violet shadow-sm'
                    : 'text-txt-muted hover:text-txt-secondary',
                ].join(' ')}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Collapsible filters ────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants} className="space-y-3">
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 text-sm font-medium text-txt-muted hover:text-txt-secondary transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-accent-violet/20 text-accent-violet">
                {activeFilterCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                key="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {/* GlassCard wraps the filter content */}
                <GlassCard
                  animate={false}
                  padding="p-4"
                  className="rounded-2xl border border-[var(--glass-border)] space-y-4"
                >
                  {/* Popular tags */}
                  {popularTags?.length > 0 && (
                    <div>
                      <p className="text-xs text-txt-muted font-medium uppercase tracking-wider mb-2">
                        Popular Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {popularTags.map((t) => {
                          const tag    = t._id ?? t;
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={[
                                'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                                active
                                  ? 'bg-accent-violet/20 text-accent-violet border-accent-violet/30'
                                  : 'glass text-txt-muted border-[var(--glass-border)] hover:text-txt-secondary',
                              ].join(' ')}
                            >
                              #{tag}
                              {t.count != null && (
                                <span className="ml-1 opacity-60">({t.count})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-txt-muted font-medium uppercase tracking-wider mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm glass border border-[var(--glass-border)]
                                   text-txt-primary focus:outline-none focus:border-accent-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-txt-muted font-medium uppercase tracking-wider mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm glass border border-[var(--glass-border)]
                                   text-txt-primary focus:outline-none focus:border-accent-primary/40"
                      />
                    </div>
                  </div>

                  {/* Clear all */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-accent-danger/70 hover:text-accent-danger transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Event count ────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!loading && filteredEvents.length > 0 && (
            <motion.p
              key={`count-${activeTab}-${filteredEvents.length}-${activeCategory}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-txt-muted font-medium uppercase tracking-wider"
            >
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
              {activeCategory !== 'all' && ` · ${activeCategoryLabel}`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Error state ────────────────────────────────────────────────────── */}
        {error && !loading && (
          <motion.div
            variants={sectionVariants}
            className="glass border border-red-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <span className="text-accent-danger text-lg">⚠️</span>
            <p className="text-sm text-accent-danger">
              Failed to load events. <button onClick={() => dispatch(fetchViewportEvents(WORLD_BOUNDS))} className="underline hover:no-underline">Try again</button>
            </p>
          </motion.div>
        )}

        {/* ── Event grid / list ──────────────────────────────────────────────── */}
        <motion.div variants={sectionVariants} className="min-h-[240px]">
          {loading ? (
            <LoadingGrid count={6} />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon="events"
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          ) : (
            <motion.div
              key={`grid-${activeTab}-${activeCategory}`}
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
        </motion.div>

      </div>

      {/* ── FAB: mobile create button ──────────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 420, damping: 22 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleCreateEvent}
        aria-label="Create new event"
        className="sm:hidden fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full
                   bg-gradient-to-r from-accent-primary to-accent-violet text-white text-2xl font-bold
                   shadow-xl shadow-accent-violet/30
                   flex items-center justify-center
                   hover:opacity-90 transition-opacity"
      >
        +
      </motion.button>
    </motion.div>
  );
}
