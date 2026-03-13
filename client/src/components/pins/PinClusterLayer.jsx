/**
 * PinClusterLayer — renders all pins on the Leaflet map using markercluster.
 *
 * Must be rendered inside a <MapContainer> (uses useMap from react-leaflet).
 *
 * Pin shape:
 *   { _id, title, description, category,
 *     location: { type: 'Point', coordinates: [lng, lat] },
 *     images, creator, likes, saves, rating, reviewCount }
 */

import { useEffect, useRef, memo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedPin } from '../../features/pins/pinSlice';
import { openModal } from '../../features/ui/uiSlice';
import { getCategoryColor, getCategoryIconSvg } from './PinCategoryIcon';

// ─── Inject marker animation CSS ─────────────────────────────────────────────
let markerCssInjected = false;
function ensureMarkerCSS() {
  if (markerCssInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pin-pop-in {
      0%   { transform: scale(0); opacity: 0; }
      70%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .pin-marker-wrap {
      animation: pin-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      transition: transform 0.15s ease;
      transform-origin: bottom center;
    }
    .pin-marker-wrap:hover {
      transform: scale(1.2);
    }
    .dark-tooltip {
      background: rgba(8, 11, 18, 0.92) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      font-family: 'DM Sans', sans-serif !important;
      font-size: 12px !important;
      padding: 4px 10px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
    }
    .dark-tooltip::before {
      border-top-color: rgba(8, 11, 18, 0.92) !important;
    }
  `;
  document.head.appendChild(style);
  markerCssInjected = true;
}

// ─── Cluster icon factory ────────────────────────────────────────────────────

/**
 * Build a blue glowing cluster circle icon.
 * Size scales with cluster population.
 */
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();

  let size, fontSize;
  if (count < 10) {
    size = 36;
    fontSize = 12;
  } else if (count < 50) {
    size = 44;
    fontSize = 13;
  } else {
    size = 54;
    fontSize = 14;
  }

  const half = size / 2;

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.85);
      border: 2px solid rgba(147, 197, 253, 0.6);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.6), 0 0 24px rgba(59, 130, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'DM Sans', sans-serif;
      font-size: ${fontSize}px;
      font-weight: 700;
      color: #fff;
      backdrop-filter: blur(4px);
    ">
      ${count}
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

// ─── Pin icon factory ────────────────────────────────────────────────────────

/**
 * Build a teardrop-shaped divIcon for a single pin.
 *
 * @param {string} category
 * @returns {L.DivIcon}
 */
function createPinIcon(category) {
  ensureMarkerCSS();
  const color = getCategoryColor(category);
  const iconSvg = getCategoryIconSvg(category);

  const html = `
    <div class="pin-marker-wrap">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z"
          fill="${color}"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
        />
        <circle cx="16" cy="14" r="9" fill="rgba(0,0,0,0.2)"/>
        <g transform="translate(9, 7)">
          ${iconSvg}
        </g>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    tooltipAnchor: [16, -8],
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const PinClusterLayer = memo(function PinClusterLayer() {
  const map = useMap();
  const dispatch = useDispatch();

  const pins = useSelector((state) => state.pins?.pins ?? []);
  const filters = useSelector((state) => state.pins?.filters ?? {});

  // Keep a stable ref to the cluster group so we can clean up properly
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    ensureMarkerCSS();

    // ── Create cluster group ─────────────────────────────────────────────────
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    // ── Filter pins ──────────────────────────────────────────────────────────
    const categoryFilter = filters.category;
    const visiblePins = pins.filter((pin) => {
      if (!categoryFilter || categoryFilter === 'all') return true;
      return pin.category === categoryFilter;
    });

    // ── Add markers ──────────────────────────────────────────────────────────
    visiblePins.forEach((pin) => {
      const [lng, lat] = pin.location?.coordinates ?? [0, 0];
      if (!lat && !lng) return;  // skip if no coordinates

      const icon = createPinIcon(pin.category ?? 'other');

      const marker = L.marker([lat, lng], { icon });

      // Tooltip on hover
      marker.bindTooltip(pin.title ?? 'Pin', {
        direction: 'top',
        offset: [0, -36],
        className: 'dark-tooltip',
        permanent: false,
        opacity: 1,
      });

      // Click → select pin + open detail modal
      marker.on('click', () => {
        dispatch(setSelectedPin(pin));
        dispatch(openModal({ type: 'pinDetail', data: { id: pin._id } }));
      });

      clusterGroup.addLayer(marker);
    });

    // ── Cleanup on re-render ─────────────────────────────────────────────────
    return () => {
      map.removeLayer(clusterGroup);
      clusterGroupRef.current = null;
    };
  }, [map, pins, filters, dispatch]);

  return null;
});

PinClusterLayer.displayName = 'PinClusterLayer';
export default PinClusterLayer;
