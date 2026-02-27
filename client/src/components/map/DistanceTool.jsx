import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

function formatDist(km) {
  return km < 1
    ? `${(km * 1000).toFixed(0)} m`
    : `${km.toFixed(2)} km`;
}

function waypointIcon(num) {
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:rgba(15,21,32,0.85);
      border:2px solid #3b82f6;
      color:#3b82f6;font-size:11px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
      font-family:'DM Sans',sans-serif;
      box-shadow:0 0 8px rgba(59,130,246,0.3);
    ">${num}</div>`,
  });
}

export default function DistanceTool({ onClose }) {
  const map = useMap();
  const [waypoints, setWaypoints] = useState([]);
  const [totalDist, setTotalDist] = useState(0);
  const markersRef = useRef([]);
  const linesRef = useRef([]);
  const labelsRef = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const clearAll = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    linesRef.current.forEach((l) => l.remove());
    labelsRef.current.forEach((l) => l.remove());
    markersRef.current = [];
    linesRef.current = [];
    labelsRef.current = [];
    setWaypoints([]);
    setTotalDist(0);
  }, []);

  const redraw = useCallback(
    (pts) => {
      // Clear existing lines and labels
      linesRef.current.forEach((l) => l.remove());
      labelsRef.current.forEach((l) => l.remove());
      linesRef.current = [];
      labelsRef.current = [];

      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const from = turf.point([pts[i - 1].lng, pts[i - 1].lat]);
        const to = turf.point([pts[i].lng, pts[i].lat]);
        const dist = turf.distance(from, to, { units: 'kilometers' });
        total += dist;

        // Line
        const line = L.polyline(
          [
            [pts[i - 1].lat, pts[i - 1].lng],
            [pts[i].lat, pts[i].lng],
          ],
          {
            color: '#3b82f6',
            weight: 2,
            dashArray: '8,6',
            opacity: 0.8,
          }
        ).addTo(map);
        linesRef.current.push(line);

        // Distance label at midpoint
        const midLat = (pts[i - 1].lat + pts[i].lat) / 2;
        const midLng = (pts[i - 1].lng + pts[i].lng) / 2;
        const label = L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: '',
            iconSize: [80, 22],
            iconAnchor: [40, 11],
            html: `<div style="
              background:rgba(15,21,32,0.85);
              backdrop-filter:blur(8px);
              border:1px solid rgba(59,130,246,0.2);
              border-radius:6px;padding:2px 6px;
              color:#06b6d4;font-size:10px;font-weight:600;
              font-family:'JetBrains Mono',monospace;
              text-align:center;white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
            ">${formatDist(dist)}</div>`,
          }),
          interactive: false,
        }).addTo(map);
        labelsRef.current.push(label);
      }

      setTotalDist(total);
    },
    [map]
  );

  useEffect(() => {
    const handleClick = (e) => {
      setWaypoints((prev) => {
        if (prev.length >= 20) return prev;
        const next = [...prev, e.latlng];

        const marker = L.marker(e.latlng, {
          icon: waypointIcon(next.length),
        }).addTo(map);
        markersRef.current.push(marker);

        redraw(next);
        return next;
      });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, redraw]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      linesRef.current.forEach((l) => l.remove());
      labelsRef.current.forEach((l) => l.remove());
    };
  }, []);

  const undoLast = () => {
    if (waypoints.length === 0) return;
    const last = markersRef.current.pop();
    if (last) last.remove();
    const next = waypoints.slice(0, -1);
    setWaypoints(next);
    redraw(next);
  };

  return (
    <div
      ref={containerRef}
      className="rounded-xl px-4 py-3 min-w-[250px]"
      style={{
        background: 'rgba(15,21,32,0.9)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(59,130,246,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-txt-primary font-heading">Measure Distance</span>
        <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Total distance */}
      <div className="bg-white/5 rounded-lg px-3 py-2.5 mb-3 text-center">
        <p className="text-xs text-txt-muted mb-0.5">Total Distance</p>
        <p className="text-lg font-mono font-bold text-accent-primary">
          {waypoints.length < 2 ? '—' : formatDist(totalDist)}
        </p>
        <p className="text-xs text-txt-muted">
          {waypoints.length} point{waypoints.length !== 1 ? 's' : ''} · {linesRef.current.length} segment{linesRef.current.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Instructions */}
      <p className="text-xs text-txt-muted mb-3">
        Click on the map to add waypoints. {waypoints.length >= 20 ? '(max reached)' : ''}
      </p>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={undoLast}
          disabled={waypoints.length === 0}
          className="flex-1 py-1.5 text-xs font-medium text-txt-muted hover:text-accent-warning bg-white/5 hover:bg-accent-warning/10 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          Undo Last
        </button>
        <button
          onClick={clearAll}
          disabled={waypoints.length === 0}
          className="flex-1 py-1.5 text-xs font-medium text-txt-muted hover:text-accent-danger bg-white/5 hover:bg-accent-danger/10 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
