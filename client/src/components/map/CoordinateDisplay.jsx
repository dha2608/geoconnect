/**
 * CoordinateDisplay.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Shows a small monospace coordinate readout in the bottom-left of the map.
 * Tracks the mouse cursor position (desktop) or map center (mobile).
 *
 * Features:
 *  • Monospace font for easy reading
 *  • DMS (degrees/minutes/seconds) and decimal formats, toggle-able
 *  • Click-to-copy coordinates to clipboard
 *  • Subtle glass styling matching the app design
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMapEvents, useMap } from 'react-leaflet';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert decimal degrees to DMS string.
 * @param {number} dd - Decimal degrees
 * @param {'lat'|'lng'} type
 * @returns {string} e.g. "10°49'23.2\"N"
 */
function toDMS(dd, type) {
  const dir = type === 'lat'
    ? (dd >= 0 ? 'N' : 'S')
    : (dd >= 0 ? 'E' : 'W');
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(4, '0')}"${dir}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoordinateDisplay() {
  const map = useMap();
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [useDMS, setUseDMS] = useState(true);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);

  // Track mouse position on desktop
  useMapEvents({
    mousemove(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      // Fall back to map center when mouse leaves
      const c = map.getCenter();
      setCoords({ lat: c.lat, lng: c.lng });
    },
  });

  // Initial: use map center
  useEffect(() => {
    const c = map.getCenter();
    setCoords({ lat: c.lat, lng: c.lng });
  }, [map]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!coords) return;
    const text = useDMS
      ? `${toDMS(coords.lat, 'lat')} ${toDMS(coords.lng, 'lng')}`
      : `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Coordinates copied!', { duration: 1500 });
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  }, [coords, useDMS]);

  // Toggle format
  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setUseDMS((v) => !v);
  }, []);

  if (!coords) return null;

  const display = useDMS
    ? `${toDMS(coords.lat, 'lat')}  ${toDMS(coords.lng, 'lng')}`
    : `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

  return (
    <div
      onClick={handleCopy}
      className="absolute bottom-3 left-3 z-[1000]
                 flex items-center gap-2
                 px-3 py-1.5 rounded-lg
                 bg-black/60 backdrop-blur-md border border-white/10
                 cursor-pointer select-none
                 hover:bg-black/75 transition-colors duration-150"
      title="Click to copy coordinates"
    >
      {/* Coordinate text */}
      <span
        className="text-[11px] leading-none tracking-wider text-white/80"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace" }}
      >
        {display}
      </span>

      {/* DMS/DD toggle */}
      <button
        onClick={handleToggle}
        className="text-[9px] font-bold tracking-wide text-white/50 hover:text-white/80
                   px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10
                   transition-colors uppercase"
        title={useDMS ? 'Switch to decimal degrees' : 'Switch to DMS'}
      >
        {useDMS ? 'DMS' : 'DD'}
      </button>

      {/* Copy indicator */}
      {copied && (
        <span className="text-[10px] text-green-400 font-semibold">✓</span>
      )}
    </div>
  );
}
