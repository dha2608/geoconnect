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

import {
  IconSearch,
  IconX,
  IconAlert,
  IconClock,
  IconMapPin,
  IconUser,
  IconPin,
  IconCalendar,
} from './SearchIcons';
import {
  PlaceCard,
  UserCard,
  PinCard,
  EventCard,
  SectionHeader,
} from './SearchCards';
import {
  MiniSpinner,
  ViewLoading,
  ViewNoResults,
  ViewEmpty,
} from './SearchViews';

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
    navigate('/map');
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
    navigate('/map');
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectUser = useCallback((user) => {
    navigate(`/profile/${user._id}`);
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectPin = useCallback((pin) => {
    const [lng, lat] = pin.location?.coordinates || [];
    if (lat != null && lng != null) {
      navigate('/map');
      dispatch(flyToLocation({ lat, lng, zoom: 17 }));
    }
    dispatch(setSelectedPin(pin));
    dispatch(openModal({ type: 'pinDetail', data: { pinId: pin._id } }));
    dispatch(closePanel());
  }, [dispatch, navigate]);

  const handleSelectEvent = useCallback((event) => {
    const [lng, lat] = event.location?.coordinates || [];
    if (lat != null && lng != null) {
      navigate('/map');
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
