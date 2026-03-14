/**
 * ScaleBar.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Dynamic map scale indicator rendered inside <MapContainer>.
 *
 * Features:
 *  • Metric (m / km) and Imperial (ft / mi) rows
 *  • Recalculates on every zoomend / moveend (latitude-corrected)
 *  • Glass design matching the rest of the app
 *  • Positioned bottom-left, above the CoordinateDisplay widget
 *  • Isolated from Leaflet's click/scroll propagation via L.DomEvent
 *
 * Scale formula (Web Mercator):
 *   metersPerPixel = 156543.03392 × cos(lat × π/180) / 2^zoom
 */

import { useEffect, useState, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Target maximum width (px) the scale bar can reach before snapping. */
const BAR_MAX_PX = 140;

const FEET_PER_METER = 3.28084;
const FEET_PER_MILE  = 5280;

/** Preferred "round" metric step values in metres. */
const NICE_METRIC = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000,
];

/** Preferred "round" imperial step values in feet (sub-mile). */
const NICE_FEET = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000];

/** Preferred "round" imperial step values in whole miles. */
const NICE_MILES = [1, 2, 5, 10, 20, 50, 100, 200, 500];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the largest value in `list` that is ≤ `maxVal`.
 * Assumes `list` is sorted ascending.
 */
function floorToNice(maxVal, list) {
  let best = list[0];
  for (const n of list) {
    if (n <= maxVal) best = n;
    else break;
  }
  return best;
}

/**
 * Compute both metric and imperial scale bar data for the current map view.
 *
 * @param {import('leaflet').Map} map
 * @returns {{ metricWidth: number, metricLabel: string, imperialWidth: number, imperialLabel: string }}
 */
function computeScale(map) {
  const { lat } = map.getCenter();
  const zoom    = map.getZoom();

  // Latitude-corrected metres per screen pixel (Web Mercator / EPSG:3857)
  const mpp    = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const maxM   = mpp * BAR_MAX_PX;

  // ── Metric ──────────────────────────────────────────────────────────────────
  const niceM       = floorToNice(maxM, NICE_METRIC);
  const metricWidth = Math.round(niceM / mpp);
  const metricLabel = niceM >= 1000
    ? `${niceM / 1000} km`
    : `${niceM} m`;

  // ── Imperial ─────────────────────────────────────────────────────────────────
  const maxFt = maxM * FEET_PER_METER;
  let niceFt;
  let imperialLabel;

  if (maxFt >= FEET_PER_MILE) {
    const niceMi  = floorToNice(maxFt / FEET_PER_MILE, NICE_MILES);
    niceFt        = niceMi * FEET_PER_MILE;
    imperialLabel = `${niceMi} mi`;
  } else {
    niceFt        = floorToNice(maxFt, NICE_FEET);
    imperialLabel = `${niceFt} ft`;
  }

  const imperialWidth = Math.round(niceFt / FEET_PER_METER / mpp);

  return { metricWidth, metricLabel, imperialWidth, imperialLabel };
}

// ── ScaleRow sub-component ────────────────────────────────────────────────────

/**
 * A single labelled scale row: text label centred above a ruled line with
 * end-cap ticks.
 *
 * @param {{ label: string, widthPx: number, lineColor: string }} props
 */
function ScaleRow({ label, widthPx, lineColor }) {
  return (
    <div
      className="flex flex-col items-start"
      style={{ width: widthPx }}
    >
      {/* Centred distance label */}
      <span
        className="block w-full text-center text-[10px] font-mono leading-none tracking-wide mb-[3px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>

      {/* Ruled line with left / right end ticks */}
      <div className="relative w-full" style={{ height: 8 }}>
        {/* Left tick */}
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 1.5, background: lineColor, borderRadius: 1 }}
        />

        {/* Horizontal bar — vertically centred */}
        <div
          className="absolute inset-x-0"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: 1.5,
            background: lineColor,
          }}
        />

        {/* Right tick */}
        <div
          className="absolute right-0 top-0 bottom-0"
          style={{ width: 1.5, background: lineColor, borderRadius: 1 }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScaleBar() {
  const map          = useMap();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef(null);

  // Compute initial scale after mount
  useEffect(() => {
    setScale(computeScale(map));
  }, [map]);

  // Prevent click / scroll events from leaking through to the Leaflet canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  // Recompute whenever the map is zoomed or panned (latitude shifts the scale)
  // Also flash the scale bar briefly on zoom/pan for user orientation
  useMapEvents({
    zoomend: () => {
      setScale(computeScale(map));
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setIsVisible(false), 3000);
    },
    moveend: () => {
      setScale(computeScale(map));
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setIsVisible(false), 3000);
    },
  });

  if (!scale) return null;

  const { metricWidth, metricLabel, imperialWidth, imperialLabel } = scale;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 1500);
      }}
      // bottom-11 (44 px) sits comfortably above CoordinateDisplay (bottom-3 + ~25 px height ≈ 37 px)
      className={`absolute bottom-11 left-3 z-[1000]
                 px-2.5 pt-1.5 pb-2 glass rounded-lg
                 flex flex-col gap-2
                 select-none transition-all duration-300
                 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="img"
      aria-label="Map scale bar"
    >
      {/* Metric row — blue accent */}
      <ScaleRow
        label={metricLabel}
        widthPx={metricWidth}
        lineColor="rgba(59, 130, 246, 0.80)"
      />

      {/* Imperial row — muted slate */}
      <ScaleRow
        label={imperialLabel}
        widthPx={imperialWidth}
        lineColor="rgba(148, 163, 184, 0.60)"
      />
    </div>
  );
}
