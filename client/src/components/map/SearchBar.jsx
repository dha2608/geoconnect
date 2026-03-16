import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { geocodeApi } from '../../api/geocodeApi';
import { pinApi } from '../../api/pinApi';
import { flyToLocation, setDestination } from '../../features/map/mapSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'geo_search_history';
const MAX_HISTORY = 5;

const CATEGORIES = [
  { label: 'Restaurant',  emoji: '🍽️' },
  { label: 'Coffee',      emoji: '☕'  },
  { label: 'Gas station', emoji: '⛽'  },
  { label: 'Hotel',       emoji: '🏨'  },
  { label: 'ATM',         emoji: '🏧'  },
  { label: 'Parking',     emoji: '🅿️'  },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  try {
    const current = loadHistory();
    // Deduplicate by display_name, newest first, capped at MAX_HISTORY
    const filtered = current.filter(h => h.display_name !== entry.display_name);
    const updated  = [entry, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/** Returns an emoji for a Nominatim result's type/class, or null → use the default pin. */
function getResultTypeIcon(type = '', cls = '') {
  const t = `${type} ${cls}`.toLowerCase();
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe') || t.includes('fast_food')) return '🍽️';
  if (t.includes('hotel') || t.includes('lodging') || t.includes('accommodation') || t.includes('guest_house')) return '🏨';
  if (t.includes('fuel') || t.includes('gas') || t.includes('petrol')) return '⛽';
  if (t.includes('atm') || t.includes('bank')) return '🏧';
  if (t.includes('parking')) return '🅿️';
  if (t.includes('hospital') || t.includes('clinic') || t.includes('pharmacy')) return '🏥';
  if (t.includes('school') || t.includes('university') || t.includes('college')) return '🏫';
  if (t.includes('airport')) return '✈️';
  if (t.includes('park') || t.includes('garden')) return '🌳';
  if (t.includes('shop') || t.includes('store') || t.includes('market') || t.includes('supermarket')) return '🛍️';
  if (t.includes('entertainment') || t.includes('cinema') || t.includes('theatre')) return '🎭';
  if (t.includes('sports') || t.includes('stadium') || t.includes('gym')) return '⚽';
  if (t.includes('culture') || t.includes('museum') || t.includes('library')) return '🏛️';
  if (t.includes('outdoors') || t.includes('nature') || t.includes('trail')) return '🌿';
  if (t.includes('travel') || t.includes('tourism') || t.includes('attraction')) return '🧳';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchBar() {
  const dispatch     = useDispatch();
  // User's current GPS location for computing distance badges
  const userLocation = useSelector(state => state.map.userLocation);

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [isOpen,      setIsOpen]      = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history,     setHistory]     = useState(loadHistory); // lazy-init

  const inputRef       = useRef(null);
  const debounceRef    = useRef(null);
  const blurTimeoutRef = useRef(null); // cancelable close timer

  // ── Core search — queries both DB pins and Nominatim geocoding in parallel ──
  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      // Build params for pin search
      const pinParams = { q };
      if (userLocation) {
        pinParams.lat = userLocation.lat;
        pinParams.lng = userLocation.lng;
        pinParams.radius = 10; // 10 km
      }

      // Search both sources in parallel
      const [pinRes, geoRes] = await Promise.allSettled([
        pinApi.searchNearbyPins(pinParams),
        q.length >= 3 ? geocodeApi.search(q) : Promise.resolve({ data: [] }),
      ]);

      // Normalize pin results to common format
      const pinData = pinRes.status === 'fulfilled'
        ? (pinRes.value.data?.data || pinRes.value.data || [])
        : [];
      const pins = (Array.isArray(pinData) ? pinData : []).map(p => ({
        _source: 'pin',
        _id: p._id,
        display_name: p.title,
        lat: String(p.location?.coordinates?.[1] ?? 0),
        lon: String(p.location?.coordinates?.[0] ?? 0),
        type: p.category || 'place',
        class: 'pin',
        category: p.category,
        address: p.address,
        description: p.description,
        distance: p.distance, // meters from $geoNear
        images: p.images,
        createdBy: p.createdBy,
      }));

      // Normalize geocode results (unwrap server wrapper {success, data})
      const geoRaw = geoRes.status === 'fulfilled' ? geoRes.value.data : null;
      const geoData = geoRaw?.data ?? geoRaw ?? [];
      const geo = (Array.isArray(geoData) ? geoData : []).map(l => ({
        ...l,
        _source: 'geocode',
      }));

      setResults([...pins, ...geo]);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  // Debounced search on every query keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Listen for category-chip searches fired by QuickCategories.
  // Populates the input text and immediately triggers a geocode search.
  useEffect(() => {
    const handleCategorySearch = (e) => {
      const { query: categoryQuery } = e.detail;
      setQuery(categoryQuery);
      search(categoryQuery);
    };
    window.addEventListener('geo:category-search', handleCategorySearch);
    return () => window.removeEventListener('geo:category-search', handleCategorySearch);
  }, [search]);

  // Reset keyboard cursor whenever the visible list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [results, query]);

  // ── Distance badge ────────────────────────────────────────────────────────────
  const getDistance = useCallback((result) => {
    // Pin results from $geoNear already have distance in meters
    if (result._source === 'pin' && result.distance != null) {
      const distM = result.distance;
      if (distM < 1000) return `${Math.round(distM)} m`;
      return `${(distM / 1000).toFixed(1)} km`;
    }
    if (!userLocation) return null;
    const dist = haversine(
      userLocation.lat, userLocation.lng,
      parseFloat(result.lat), parseFloat(result.lon),
    );
    if (dist < 1) return `${Math.round(dist * 1000)} m`;
    return `${dist.toFixed(1)} km`;
  }, [userLocation]);

  // ── History helpers ───────────────────────────────────────────────────────────
  const handleDeleteHistory = useCallback((e, idx) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== idx);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [history]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // ── Focus / Blur with cancelable close timer ──────────────────────────────────
  const handleFocus = () => {
    // Cancel any pending close so re-focusing doesn't hide the dropdown
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Give dropdown buttons enough time to fire onClick before we hide
    blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  // ── Selection handlers ────────────────────────────────────────────────────────
  const handleSelect = (result) => {
    // Auto-save every selection to history
    const updated = saveToHistory({
      display_name: result.display_name,
      lat: result.lat,
      lon: result.lon,
    });
    setHistory(updated);

    dispatch(flyToLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      zoom: 16,
    }));
    setQuery(result.display_name.split(',')[0]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleHistorySelect = (item) => {
    dispatch(flyToLocation({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      zoom: 16,
    }));
    setQuery(item.display_name.split(',')[0]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSetDestination = (result) => {
    const lat     = parseFloat(result.lat);
    const lng     = parseFloat(result.lon);
    const name    = result.display_name.split(',')[0];
    const address = result.display_name;
    dispatch(setDestination({ lat, lng, name, address }));
    dispatch(flyToLocation({ lat, lng, zoom: 16 }));
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
    // Re-focus → handleFocus cancels blurTimeoutRef → dropdown opens to history panel
  };

  const handleCategoryClick = (category) => {
    setQuery(category.label);
    // Skip the 300 ms debounce — fire immediately for snappy UX
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(category.label);
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    // Decide which list Arrow/Enter operates on
    const navList = results.length > 0
      ? results
      : (query.length === 0 ? history : []);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex(prev => Math.min(prev + 1, navList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = navList[activeIndex];
      if (!item) return;
      if (results.length > 0) {
        handleSelect(item);
      } else if (query.length === 0) {
        handleHistorySelect(item);
      }
    }
  };

  // ── Derived visibility ────────────────────────────────────────────────────────
  const showHistoryPanel = isOpen && query.length === 0;
  const showResults      = isOpen && query.length >= 2 && results.length > 0;
  const showEmpty        = isOpen && query.length >= 2 && results.length === 0 && !isLoading;
  const showDropdown     = showHistoryPanel || showResults || showEmpty;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="absolute top-4 left-4 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto z-[1001]">

      {/* ── Search Input ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-xl flex items-center gap-2 px-3 py-2.5">
        {/* Magnifier */}
        <svg className="w-4 h-4 text-txt-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        <input
          ref={inputRef}
          data-search-input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search locations..."
          className="flex-1 bg-transparent text-sm text-txt-primary placeholder:text-txt-muted outline-none font-body"
        />

        {/* Loading spinner */}
        {isLoading && (
          <svg className="w-4 h-4 text-accent-primary animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
          </svg>
        )}

        {/* Clear button */}
        {query && !isLoading && (
          <button onClick={handleClear} className="text-txt-muted hover:text-txt-primary transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Unified Dropdown ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            key="search-dropdown"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="mt-2 glass rounded-xl overflow-hidden"
          >

            {/* ── History Panel: shown when focused with empty query ─────────── */}
            {showHistoryPanel && (
              <>
                {/* Category quick-search chips */}
                <div className="px-3 pt-3 pb-2.5">
                  <p className="text-[10px] font-body text-txt-muted uppercase tracking-wider mb-2.5">
                    Quick search
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.label}
                        onMouseDown={(e) => e.preventDefault()} // keep input focused
                        onClick={() => handleCategoryClick(cat)}
                        className="glass rounded-full px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-colors font-body flex items-center gap-1.5"
                      >
                        <span role="img" aria-label={cat.label}>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent history — only shown when history is non-empty */}
                {history.length > 0 && (
                  <>
                    <div className="border-t border-surface-divider" />

                    {/* Section header */}
                    <div className="px-3 py-2 flex items-center justify-between">
                      <p className="text-[10px] font-body text-txt-muted uppercase tracking-wider">
                        Recent
                      </p>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleClearHistory}
                        className="text-xs text-accent-primary hover:underline font-body"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="max-h-44 overflow-y-auto">
                      {history.map((item, i) => (
                        <div
                          key={`hist-${i}`}
                          className={`flex items-center border-b border-surface-divider last:border-0 transition-colors group ${
                            activeIndex === i ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                          }`}
                        >
                          {/* Click area → fly to saved location */}
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleHistorySelect(item)}
                            className="flex-1 px-3 py-2.5 flex items-center gap-3 text-left min-w-0"
                          >
                            {/* Clock icon */}
                            <svg
                              className="w-4 h-4 text-txt-muted flex-shrink-0"
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span className="text-sm text-txt-secondary truncate font-body">
                              {item.display_name.split(',')[0]}
                            </span>
                          </button>

                          {/* Per-item delete */}
                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => handleDeleteHistory(e, i)}
                            title="Remove from history"
                            className="p-2 mr-1.5 text-txt-muted hover:text-txt-primary opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Search Results — pins first, then geocode, sorted by distance ── */}
            {showResults && (() => {
              const pinResults = [...results.filter(r => r._source === 'pin')].sort((a, b) => {
                const dA = a.distance ?? (userLocation ? haversine(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lon)) * 1000 : 0);
                const dB = b.distance ?? (userLocation ? haversine(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lon)) * 1000 : 0);
                return dA - dB;
              });
              const geoResults = [...results.filter(r => r._source !== 'pin')].sort((a, b) => {
                if (!userLocation) return 0;
                return haversine(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lon))
                     - haversine(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lon));
              });
              // Combined flat list for keyboard navigation
              const allResults = [...pinResults, ...geoResults];
              return (
                <div className="max-h-72 overflow-y-auto">
                  {/* Nearby places from DB */}
                  {pinResults.length > 0 && (
                    <>
                      <div className="px-3 py-1.5">
                        <p className="text-[10px] font-body text-txt-muted uppercase tracking-wider">Nearby places</p>
                      </div>
                      {pinResults.map((result, i) => {
                        const typeIcon = getResultTypeIcon(result.type, result.class);
                        const dist = getDistance(result);
                        const flatIdx = i;
                        return (
                          <div
                            key={`pin-${result._id || i}`}
                            className={`flex items-center border-b border-surface-divider last:border-0 transition-colors group ${
                              activeIndex === flatIdx ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                            }`}
                          >
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelect(result)}
                              className="flex-1 px-3 py-2.5 flex items-start gap-3 text-left min-w-0"
                            >
                              <span className="mt-0.5 flex-shrink-0 w-4 flex items-center justify-center">
                                {typeIcon ? (
                                  <span className="text-sm leading-none" role="img">{typeIcon}</span>
                                ) : (
                                  <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                                  </svg>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-txt-primary truncate">{result.display_name}</p>
                                <p className="text-xs text-txt-muted truncate">{result.address || result.description || ''}</p>
                              </div>
                              {dist && (
                                <span className="ml-2 flex-shrink-0 self-center text-xs font-mono text-txt-muted bg-surface-hover rounded px-1.5 py-0.5 whitespace-nowrap">
                                  {dist}
                                </span>
                              )}
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSetDestination(result)}
                              title="Set as destination"
                              className="p-2 mr-2 text-txt-muted hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Locations from geocoding */}
                  {geoResults.length > 0 && (
                    <>
                      {pinResults.length > 0 && <div className="border-t border-surface-divider" />}
                      <div className="px-3 py-1.5">
                        <p className="text-[10px] font-body text-txt-muted uppercase tracking-wider">Locations</p>
                      </div>
                      {geoResults.map((result, i) => {
                        const typeIcon = getResultTypeIcon(result.type, result.class);
                        const dist = getDistance(result);
                        const flatIdx = pinResults.length + i;
                        return (
                          <div
                            key={result.place_id || `geo-${i}`}
                            className={`flex items-center border-b border-surface-divider last:border-0 transition-colors group ${
                              activeIndex === flatIdx ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                            }`}
                          >
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelect(result)}
                              className="flex-1 px-3 py-2.5 flex items-start gap-3 text-left min-w-0"
                            >
                              <span className="mt-0.5 flex-shrink-0 w-4 flex items-center justify-center">
                                {typeIcon ? (
                                  <span className="text-sm leading-none" role="img">{typeIcon}</span>
                                ) : (
                                  <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                                  </svg>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-txt-primary truncate">{result.display_name.split(',')[0]}</p>
                                <p className="text-xs text-txt-muted truncate">{result.display_name}</p>
                              </div>
                              {dist && (
                                <span className="ml-2 flex-shrink-0 self-center text-xs font-mono text-txt-muted bg-surface-hover rounded px-1.5 py-0.5 whitespace-nowrap">
                                  {dist}
                                </span>
                              )}
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSetDestination(result)}
                              title="Set as destination"
                              className="p-2 mr-2 text-txt-muted hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ── Empty state ───────────────────────────────────────────────── */}
            {showEmpty && (
              <div className="p-4 text-center">
                <p className="text-sm text-txt-muted font-body">No locations found</p>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
