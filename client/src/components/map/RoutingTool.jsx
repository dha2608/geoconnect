import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { clearRoutingDestination } from '../../features/map/mapSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${m} min`;
}

function formatDist(meters) {
  return meters < 1000
    ? `${meters.toFixed(0)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatETA(durationSeconds) {
  return new Date(Date.now() + durationSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Decode a Google-encoded polyline string into [[lat, lng], ...] pairs.
 * Used because OSRM returns geometries=polyline for multi-route responses.
 */
function decodePolyline(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// OSRM maneuver type → turn icon
const MANEUVER_ICONS = {
  depart: '🏁', arrive: '🏁',
  'turn-left': '↰', 'turn-right': '↱',
  'sharp left': '↰', 'sharp right': '↱',
  'slight left': '↰', 'slight right': '↱',
  'turn-slight-left': '↰', 'turn-slight-right': '↱',
  'turn-sharp-left': '↰', 'turn-sharp-right': '↱',
  straight: '↑', 'continue': '↑',
  'new name': '↑',
  merge: '⤵', fork: '⑂',
  'end of road': '↱',
  roundabout: '↻', 'exit roundabout': '↗',
  'rotary': '↻', 'exit rotary': '↗',
  ramp: '↗', 'on ramp': '↗', 'off ramp': '↘',
  notification: 'ℹ',
};

function getManeuverIcon(step) {
  const mod = step.maneuver?.modifier?.replace(/ /g, '-') || '';
  const type = step.maneuver?.type?.replace(/ /g, '-') || '';
  return MANEUVER_ICONS[`${type}-${mod}`]
    || MANEUVER_ICONS[type]
    || MANEUVER_ICONS[mod]
    || '→';
}

// ─── Transport modes ──────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'driving',
    label: 'Drive',
    profile: 'driving',
    color: '#3b82f6',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h2m10 0h2M7 5l2-3h6l2 3" />
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    id: 'walking',
    label: 'Walk',
    profile: 'foot',
    color: '#10b981',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m10 22 1-5-3-3 1-4 4 1 2 3" />
        <path d="m14 22-1-5" />
        <path d="m8 10-2 4" />
      </svg>
    ),
  },
  {
    id: 'cycling',
    label: 'Bike',
    profile: 'cycling',
    color: '#f59e0b',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h3" />
      </svg>
    ),
  },
];

// ─── Markers ──────────────────────────────────────────────────────────────────

const startIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:3px solid rgba(255,255,255,0.7);box-shadow:0 0 10px rgba(16,185,129,0.5);"></div>`,
});

const endIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid rgba(255,255,255,0.7);box-shadow:0 0 10px rgba(239,68,68,0.5);"></div>`,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoutingTool({ onClose }) {
  const map = useMap();
  const dispatch = useDispatch();
  const routingDestination = useSelector((state) => state.map.routingDestination);

  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [settingPoint, setSettingPoint] = useState('start'); // 'start' | 'end'

  // ── Route state ─────────────────────────────────────────────────────────────
  // Each entry: { distance, duration, steps }
  const [routes, setRoutes] = useState([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('driving');
  const [showSteps, setShowSteps] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  /** Array of { shadow: L.Polyline, line: L.Polyline, group: L.LayerGroup } */
  const routeLayersRef = useRef([]);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  /** Mirror of `mode` for use in stable callbacks without stale closure. */
  const modeRef = useRef(mode);

  // ── Derived ─────────────────────────────────────────────────────────────────
  // Backward-compatible alias so all existing `routeInfo` references still work.
  const routeInfo = routes[activeRouteIndex] ?? null;
  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

  // Keep modeRef in sync with state
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Prevent map events from bleeding through the panel
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  // Consume routingDestination from Redux — pre-sets the end point when
  // the user clicks "Get directions" on a DestinationMarker popup.
  useEffect(() => {
    if (!routingDestination) return;
    if (endMarkerRef.current) endMarkerRef.current.remove();
    const latlng = L.latLng(routingDestination.lat, routingDestination.lng);
    const marker = L.marker(latlng, { icon: endIcon }).addTo(map);
    endMarkerRef.current = marker;
    setEndPoint(latlng);
    setSettingPoint('start');
    dispatch(clearRoutingDestination());
  }, [routingDestination, map, dispatch]);

  // ── clearRoute ───────────────────────────────────────────────────────────────
  const clearRoute = useCallback(() => {
    routeLayersRef.current.forEach(({ group }) => {
      try { group.remove(); } catch (_) { /* already removed */ }
    });
    routeLayersRef.current = [];
    setRoutes([]);
    setActiveRouteIndex(0);
  }, []);

  // ── selectRoute ──────────────────────────────────────────────────────────────
  /**
   * Re-style all polylines and update active index.
   * Uses refs (not state) to avoid stale closures in map click handlers.
   */
  const selectRoute = useCallback((idx) => {
    const currentMode = modeRef.current;
    // Active route dash follows the mode convention; alternatives always dashed
    const activeDash =
      currentMode === 'walking' ? '8 12'
      : currentMode === 'cycling' ? '12 6'
      : null;

    routeLayersRef.current.forEach(({ shadow, line }, i) => {
      const isActive = i === idx;
      shadow.setStyle({
        weight: isActive ? 8 : 4,
        opacity: isActive ? 0.2 : 0.06,
      });
      line.setStyle({
        weight: isActive ? 4 : 2.5,
        opacity: isActive ? 0.9 : 0.35,
        dashArray: isActive ? activeDash : '6 8',
      });
      if (isActive) {
        // Bring active route to top of the layer stack
        shadow.bringToFront();
        line.bringToFront();
      }
    });

    setActiveRouteIndex(idx);
  }, []); // No deps — uses modeRef + routeLayersRef (both stable refs)

  // ── fetchRoute ───────────────────────────────────────────────────────────────
  const fetchRoute = useCallback(
    async (from, to) => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      clearRoute();

      try {
        // alternatives=3 asks OSRM for up to 3 route options.
        // geometries=polyline for compact transfer; we decode below.
        const url =
          `https://router.project-osrm.org/route/v1/${activeMode.profile}/` +
          `${from.lng},${from.lat};${to.lng},${to.lat}` +
          `?overview=full&geometries=polyline&steps=true&alternatives=3`;

        const res = await fetch(url, { signal: controller.signal });

        // Manual 15-second timeout
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        if (!res.ok) {
          clearTimeout(timeoutId);
          if (res.status === 429) {
            toast.error('Rate limited. Please wait a moment and try again.');
          } else if (res.status >= 500) {
            toast.error('Routing server is temporarily unavailable. Try again later.');
          } else {
            toast.error(`Routing failed (HTTP ${res.status}). Try different points.`);
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        clearTimeout(timeoutId);

        if (data.code === 'NoRoute') {
          toast.error(
            `No ${activeMode.label.toLowerCase()} route found between these points. ` +
            `Try a different mode or closer points.`
          );
          setLoading(false);
          return;
        }

        if (data.code !== 'Ok' || !data.routes?.length) {
          toast.error('No route found between these points. Try different locations.');
          setLoading(false);
          return;
        }

        // Active route dash pattern follows mode convention
        const activeDash =
          mode === 'walking' ? '8 12'
          : mode === 'cycling' ? '12 6'
          : null;

        const newRouteData = [];
        const newRouteLayers = [];

        // Build polylines for every returned route (primary first, then alternatives)
        data.routes.forEach((route, idx) => {
          const isActive = idx === 0;
          const coords = decodePolyline(route.geometry);
          const color = activeMode.color;

          // Glow/shadow layer
          const shadow = L.polyline(coords, {
            color,
            weight: isActive ? 8 : 4,
            opacity: isActive ? 0.2 : 0.06,
          });

          // Main line layer
          const line = L.polyline(coords, {
            color,
            weight: isActive ? 4 : 2.5,
            opacity: isActive ? 0.9 : 0.35,
            dashArray: isActive ? activeDash : '6 8',
          });

          // Clicking an alternative selects it
          line.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectRoute(idx);
          });
          shadow.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectRoute(idx);
          });

          const group = L.layerGroup([shadow, line]).addTo(map);

          newRouteLayers.push({ shadow, line, group });
          newRouteData.push({
            distance: route.distance,
            duration: route.duration,
            steps:
              route.legs?.[0]?.steps?.filter(
                (s) => s.maneuver?.type !== 'arrive' || s.distance > 0
              ) ?? [],
          });
        });

        // Ensure primary route renders on top
        if (newRouteLayers.length > 0) {
          newRouteLayers[0].shadow.bringToFront();
          newRouteLayers[0].line.bringToFront();
        }

        routeLayersRef.current = newRouteLayers;
        setRoutes(newRouteData);
        setActiveRouteIndex(0);

        // Fit map to primary route
        const primaryCoords = decodePolyline(data.routes[0].geometry);
        map.fitBounds(L.latLngBounds(primaryCoords), { padding: [40, 40] });
      } catch (err) {
        if (err.name === 'AbortError') {
          if (!abortRef.current || abortRef.current === controller) {
            toast.error('Route request timed out. Check your internet connection.');
          }
        } else if (!navigator.onLine) {
          toast.error('You appear to be offline. Check your internet connection.');
        } else {
          toast.error('Failed to calculate route. Please try again.');
        }
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [map, clearRoute, activeMode, mode, selectRoute]
  );

  // ── Map click handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (settingPoint === 'start') {
        if (startMarkerRef.current) startMarkerRef.current.remove();
        const marker = L.marker(e.latlng, { icon: startIcon }).addTo(map);
        startMarkerRef.current = marker;
        setStartPoint(e.latlng);
        setSettingPoint('end');
      } else {
        if (endMarkerRef.current) endMarkerRef.current.remove();
        const marker = L.marker(e.latlng, { icon: endIcon }).addTo(map);
        endMarkerRef.current = marker;
        setEndPoint(e.latlng);
        setSettingPoint('start');
      }
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, settingPoint]);

  // Auto-fetch route when both points are set or mode changes
  useEffect(() => {
    if (startPoint && endPoint) {
      fetchRoute(startPoint, endPoint);
    }
  }, [startPoint, endPoint, fetchRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (startMarkerRef.current) startMarkerRef.current.remove();
      if (endMarkerRef.current) endMarkerRef.current.remove();
      routeLayersRef.current.forEach(({ group }) => {
        try { group.remove(); } catch (_) {}
      });
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const swap = () => {
    const tmpStart = startPoint;
    const tmpEnd = endPoint;

    if (startMarkerRef.current) startMarkerRef.current.remove();
    if (endMarkerRef.current) endMarkerRef.current.remove();

    if (tmpEnd) {
      const m = L.marker(tmpEnd, { icon: startIcon }).addTo(map);
      startMarkerRef.current = m;
    }
    if (tmpStart) {
      const m = L.marker(tmpStart, { icon: endIcon }).addTo(map);
      endMarkerRef.current = m;
    }

    setStartPoint(tmpEnd);
    setEndPoint(tmpStart);
  };

  const reset = () => {
    if (abortRef.current) abortRef.current.abort();
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    clearRoute();
    setStartPoint(null);
    setEndPoint(null);
    setSettingPoint('start');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="glass rounded-xl px-4 py-3 min-w-[280px]"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-txt-primary font-heading">Route Planner</span>
        <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Transport mode selector ──────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-hover border border-surface-divider mb-3">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200',
                isActive
                  ? 'text-txt-primary shadow-sm'
                  : 'text-txt-muted hover:text-txt-primary',
              ].join(' ')}
              style={isActive ? {
                background: `${m.color}18`,
                border: `1px solid ${m.color}35`,
                color: m.color,
              } : {
                border: '1px solid transparent',
              }}
              title={m.label}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Point Inputs ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 mb-3">
        <button
          onClick={() => setSettingPoint('start')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
            settingPoint === 'start'
              ? 'bg-accent-success/10 border border-accent-success/30'
              : 'bg-surface-hover border border-surface-divider'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-accent-success flex-shrink-0" />
          <span className={startPoint ? 'text-txt-primary' : 'text-txt-muted'}>
            {startPoint
              ? `${startPoint.lat.toFixed(5)}, ${startPoint.lng.toFixed(5)}`
              : 'Click map to set start'}
          </span>
        </button>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={swap}
            disabled={!startPoint && !endPoint}
            className="p-1 rounded-md text-txt-muted hover:text-accent-primary bg-surface-hover hover:bg-surface-active transition disabled:opacity-30 disabled:pointer-events-none"
            title="Swap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => setSettingPoint('end')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
            settingPoint === 'end'
              ? 'bg-accent-danger/10 border border-accent-danger/30'
              : 'bg-surface-hover border border-surface-divider'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-accent-danger flex-shrink-0" />
          <span className={endPoint ? 'text-txt-primary' : 'text-txt-muted'}>
            {endPoint
              ? `${endPoint.lat.toFixed(5)}, ${endPoint.lng.toFixed(5)}`
              : 'Click map to set end'}
          </span>
        </button>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-txt-muted">
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: `${activeMode.color}30`,
              borderTopColor: activeMode.color,
            }}
          />
          Calculating {activeMode.label.toLowerCase()} route…
        </div>
      )}

      {/* ── Route Summary Cards ───────────────────────────────────────────────── */}
      {routes.length > 0 && !loading && (
        <div className="mb-3 space-y-1.5">

          {/* Active route — full progress card */}
          <div className="bg-surface-hover rounded-lg px-3 py-2.5 border border-surface-divider">
            {/* Mode header */}
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{ color: activeMode.color }}>{activeMode.icon}</span>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider font-heading"
                style={{ color: activeMode.color }}
              >
                {activeMode.label}
              </span>
              {routes.length > 1 && (
                <span className="ml-auto text-[10px] font-body text-txt-muted bg-surface-active px-1.5 py-0.5 rounded-md normal-case tracking-normal">
                  Route {activeRouteIndex + 1} of {routes.length}
                </span>
              )}
            </div>

            {/* 3-column stats */}
            <div className="grid grid-cols-3 gap-0">
              {/* Distance */}
              <div>
                <p className="text-[10px] text-txt-muted mb-0.5 font-body">Distance</p>
                <p
                  className="text-sm font-mono font-bold"
                  style={{ color: activeMode.color }}
                >
                  {formatDist(routeInfo.distance)}
                </p>
              </div>

              {/* Duration */}
              <div className="text-center border-x border-surface-divider px-1">
                <p className="text-[10px] text-txt-muted mb-0.5 font-body">Duration</p>
                <p className="text-sm font-mono font-bold text-accent-secondary">
                  {formatDuration(routeInfo.duration)}
                </p>
              </div>

              {/* ETA */}
              <div className="text-right">
                <p className="text-[10px] text-txt-muted mb-0.5 font-body">Arrive</p>
                <p className="text-sm font-mono font-bold text-txt-primary">
                  {formatETA(routeInfo.duration)}
                </p>
              </div>
            </div>
          </div>

          {/* Alternative routes — compact clickable cards */}
          {routes.length > 1 &&
            routes.map((route, idx) => {
              if (idx === activeRouteIndex) return null;

              // Label relative to active route
              const diffSecs = route.duration - routes[activeRouteIndex].duration;
              const diffSign = diffSecs > 0 ? '+' : '';
              const diffLabel = `${diffSign}${Math.round(diffSecs / 60)} min`;

              return (
                <button
                  key={idx}
                  onClick={() => selectRoute(idx)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover/60 border border-surface-divider/50 hover:bg-surface-hover hover:border-surface-divider text-left transition-all group"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Alt badge */}
                    <span className="text-[10px] font-medium text-txt-muted px-1.5 py-0.5 rounded bg-surface-active font-body shrink-0">
                      Alt {idx + 1}
                    </span>
                    {/* Distance */}
                    <span className="text-xs font-mono font-medium text-txt-secondary">
                      {formatDist(route.distance)}
                    </span>
                    <span className="text-txt-muted text-[10px]">·</span>
                    {/* Duration */}
                    <span className="text-xs font-mono text-txt-muted">
                      {formatDuration(route.duration)}
                    </span>
                    {/* Diff vs active */}
                    <span
                      className="text-[10px] font-body"
                      style={{ color: diffSecs > 0 ? '#ef4444' : '#10b981' }}
                    >
                      {diffLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* ETA */}
                    <span className="text-xs font-mono text-txt-muted">
                      {formatETA(route.duration)}
                    </span>
                    {/* Chevron */}
                    <svg
                      className="w-3 h-3 text-txt-muted group-hover:text-txt-secondary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {/* ── Turn-by-turn directions ───────────────────────────────────────────── */}
      {routeInfo?.steps?.length > 0 && !loading && (
        <div className="mb-3">
          <button
            onClick={() => setShowSteps((s) => !s)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-xs font-medium text-txt-secondary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
              Directions ({routeInfo.steps.length} steps)
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showSteps ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-surface-divider divide-y divide-surface-divider">
                  {routeInfo.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3 py-2 text-xs hover:bg-surface-hover/50 transition-colors"
                    >
                      <span className="text-sm flex-shrink-0 w-5 text-center mt-0.5">
                        {getManeuverIcon(step)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-txt-primary leading-snug">
                          {step.name
                            ? `${step.maneuver?.modifier
                                ? step.maneuver.modifier.charAt(0).toUpperCase() + step.maneuver.modifier.slice(1)
                                : 'Continue'} on ${step.name}`
                            : step.maneuver?.type === 'depart'
                              ? 'Start'
                              : step.maneuver?.type === 'arrive'
                                ? 'Arrive at destination'
                                : `${step.maneuver?.modifier || step.maneuver?.type || 'Continue'}`
                          }
                        </p>
                        <p className="text-txt-muted mt-0.5">
                          {formatDist(step.distance)} · {formatDuration(step.duration)}
                        </p>
                      </div>
                      <span className="text-txt-muted flex-shrink-0 tabular-nums mt-0.5">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Clear button ─────────────────────────────────────────────────────── */}
      <button
        onClick={reset}
        disabled={!startPoint && !endPoint}
        className="w-full py-1.5 text-xs font-medium text-txt-muted hover:text-accent-danger bg-surface-hover hover:bg-accent-danger/10 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        Clear Route
      </button>
    </div>
  );
}
