import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

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

export default function RoutingTool({ onClose }) {
  const map = useMap();
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [settingPoint, setSettingPoint] = useState('start'); // 'start' | 'end'
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const clearRoute = useCallback(() => {
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  const fetchRoute = useCallback(
    async (from, to) => {
      setLoading(true);
      clearRoute();
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code !== 'Ok' || !data.routes?.length) {
          toast.error('No route found between these points');
          setLoading(false);
          return;
        }

        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        // Draw route with glow effect
        const shadow = L.polyline(coords, {
          color: '#3b82f6',
          weight: 8,
          opacity: 0.2,
        }).addTo(map);

        const line = L.polyline(coords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.9,
        }).addTo(map);

        routeLineRef.current = L.layerGroup([shadow, line]).addTo(map);
        // Remove individual from map since layerGroup manages them
        shadow.remove();
        line.remove();
        routeLineRef.current.addLayer(shadow);
        routeLineRef.current.addLayer(line);

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
        });

        // Fit map to route bounds
        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      } catch {
        toast.error('Failed to fetch route');
      } finally {
        setLoading(false);
      }
    },
    [map, clearRoute]
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

  // Auto-fetch route when both points are set
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
      className="rounded-xl px-4 py-3 min-w-[280px]"
      style={{
        background: 'rgba(15,21,32,0.9)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(59,130,246,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
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

      {/* Point Inputs */}
      <div className="space-y-2 mb-3">
        <button
          onClick={() => setSettingPoint('start')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
            settingPoint === 'start'
              ? 'bg-accent-success/10 border border-accent-success/30'
              : 'bg-white/5 border border-white/5'
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
            className="p-1 rounded-md text-txt-muted hover:text-accent-primary bg-white/5 hover:bg-white/10 transition disabled:opacity-30 disabled:pointer-events-none"
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
              : 'bg-white/5 border border-white/5'
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
          <div className="w-4 h-4 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
          Calculating route...
        </div>
      )}

      {/* Route Info */}
      {routeInfo && !loading && (
        <div className="bg-white/5 rounded-lg px-3 py-2.5 mb-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-txt-muted">Distance</p>
              <p className="text-base font-mono font-bold text-accent-primary">
                {formatDist(routeInfo.distance)}
              </p>
            </div>
            <div className="w-px h-8 bg-white/10" />
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
        className="w-full py-1.5 text-xs font-medium text-txt-muted hover:text-accent-danger bg-white/5 hover:bg-accent-danger/10 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        Clear Route
      </button>
    </div>
  );
}
