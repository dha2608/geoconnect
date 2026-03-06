import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import { setTileLayer } from '../../features/map/mapSlice';

const TILE_OPTIONS = [
  { id: 'dark',      label: 'Dark',      icon: '🌙' },
  { id: 'street',    label: 'Street',    icon: '🗺️' },
  { id: 'light',     label: 'Light',     icon: '☀️' },
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
];

/**
 * MapControls — floating glass panel with:
 *   • Locate Me  (flies to user position via map.flyTo)
 *   • Tile layer switcher (dispatches setTileLayer)
 *   • Zoom +/−  (map.zoomIn / map.zoomOut)
 *
 * Rendered INSIDE <MapContainer> so it can call useMap().
 * L.DomEvent disables click/scroll propagation to the Leaflet canvas,
 * preventing accidental map drags when interacting with the controls.
 */
export default function MapControls() {
  const map = useMap();
  const dispatch = useDispatch();
  const { userLocation, isLocating, tileLayer } = useSelector((state) => state.map);
  const [showLayers, setShowLayers] = useState(false);
  const controlRef = useRef(null);

  // Isolate this DOM node from Leaflet's event system
  useEffect(() => {
    const el = controlRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  const handleLocateMe = () => {
    if (!userLocation) return;
    map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1.5 });
  };

  const handleTileChange = (id) => {
    dispatch(setTileLayer(id));
    setShowLayers(false);
  };

  return (
    <div
      ref={controlRef}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2"
    >
      {/* ── Locate Me ─────────────────────────────────────────────── */}
      <button
        onClick={handleLocateMe}
        disabled={isLocating || !userLocation}
        className="w-10 h-10 rounded-xl glass flex items-center justify-center text-txt-primary hover:text-accent-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="My Location"
        aria-label="Fly to my location"
      >
        {isLocating ? (
          /* Spinner while geolocation is in-flight */
          <svg
            className="w-5 h-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
          </svg>
        ) : (
          /* Crosshair / locate icon */
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
          </svg>
        )}
      </button>

      {/* ── Tile Layer Switcher ────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setShowLayers((prev) => !prev)}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-txt-primary hover:text-accent-primary transition-colors"
          title="Map Style"
          aria-label="Toggle map style"
          aria-expanded={showLayers}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </button>

        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-12 top-0 glass rounded-xl p-2 min-w-[140px]"
              role="listbox"
              aria-label="Map style options"
            >
              {TILE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTileChange(opt.id)}
                  role="option"
                  aria-selected={tileLayer === opt.id}
                  className={`w-full px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 transition-colors font-body ${
                    tileLayer === opt.id
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-white/5'
                  }`}
                >
                  <span aria-hidden="true">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zoom Controls ─────────────────────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden flex flex-col">
        <button
          onClick={() => map.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-txt-primary hover:text-accent-primary hover:bg-white/5 transition-colors border-b border-white/5"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 5v14m-7-7h14" />
          </svg>
        </button>

        <button
          onClick={() => map.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-txt-primary hover:text-accent-primary hover:bg-white/5 transition-colors"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
