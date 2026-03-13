import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { clearRoutingDestination } from '../../features/map/mapSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDist(meters) {
  return meters < 1000
    ? `${meters.toFixed(0)} m`
    : `${(meters / 1000).toFixed(1)} km`;
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
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('driving');
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

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

  const clearRoute = useCallback(() => {
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  const fetchRoute = useCallback(
    async (from, to) => {
      // Abort any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      clearRoute();

      try {
        const url = `https://router.project-osrm.org/route/v1/${activeMode.profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

        const res = await fetch(url, {
          signal: controller.signal,
          // 15 second timeout via AbortController
        });

        // Start a manual timeout
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
          toast.error(`No ${activeMode.label.toLowerCase()} route found between these points. Try a different mode or closer points.`);
          setLoading(false);
          return;
        }

        if (data.code !== 'Ok' || !data.routes?.length) {
          toast.error('No route found between these points. Try different locations.');
          setLoading(false);
          return;
        }

        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        const routeColor = activeMode.color;

        // Draw route with glow effect
        const shadow = L.polyline(coords, {
          color: routeColor,
          weight: 8,
          opacity: 0.2,
        });

        const line = L.polyline(coords, {
          color: routeColor,
          weight: 4,
          opacity: 0.9,
          dashArray: mode === 'walking' ? '8 12' : mode === 'cycling' ? '12 6' : null,
        });

        routeLineRef.current = L.layerGroup([shadow, line]).addTo(map);

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
        });

        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      } catch (err) {
        if (err.name === 'AbortError') {
          // Either user changed mode or timeout — don't show error for mode change
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
    [map, clearRoute, activeMode, mode]
  );

  // Map click handler
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
      if (routeLineRef.current) routeLineRef.current.remove();
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

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

  return (
    <div
      ref={containerRef}
      className="glass rounded-xl px-4 py-3 min-w-[280px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-txt-primary font-heading">Route Planner</span>
        <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Transport mode selector */}
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

      {/* Point Inputs */}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-txt-muted">
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: `${activeMode.color}30`,
              borderTopColor: activeMode.color,
            }}
          />
          Calculating {activeMode.label.toLowerCase()} route...
        </div>
      )}

      {/* Route Info */}
      {routeInfo && !loading && (
        <div className="bg-surface-hover rounded-lg px-3 py-2.5 mb-3">
          {/* Mode indicator */}
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: activeMode.color }}>{activeMode.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: activeMode.color }}>
              {activeMode.label}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-txt-muted">Distance</p>
              <p className="text-base font-mono font-bold" style={{ color: activeMode.color }}>
                {formatDist(routeInfo.distance)}
              </p>
            </div>
            <div className="w-px h-8 bg-surface-divider" />
            <div className="text-right">
              <p className="text-xs text-txt-muted">Duration</p>
              <p className="text-base font-mono font-bold text-accent-secondary">
                {formatDuration(routeInfo.duration)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clear button */}
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
