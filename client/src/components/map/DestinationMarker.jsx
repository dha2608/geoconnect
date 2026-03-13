/**
 * DestinationMarker.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders a red destination pin on the Leaflet map when state.map.destination
 * is set. Must be rendered inside <MapContainer>.
 *
 * Features:
 *  • Custom red teardrop divIcon with pulse animation (inline CSS)
 *  • Popup with place name, address, Remove & Get directions buttons
 *  • Dispatches clearDestination() on remove
 *  • Dark glass styling consistent with GeoConnect theme
 */

import { useSelector, useDispatch } from 'react-redux';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { clearDestination, setRoutingDestination } from '../../features/map/mapSlice';
import { setActiveMapTool } from '../../features/ui/uiSlice';

// ─── Inline CSS injected once into <head> ─────────────────────────────────────

const PULSE_CSS = `
@keyframes dest-pin-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
  60%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
@keyframes dest-pin-drop {
  0%   { transform: translateY(-14px) scale(0.85); opacity: 0; }
  70%  { transform: translateY(3px)  scale(1.04); opacity: 1; }
  100% { transform: translateY(0)    scale(1);    opacity: 1; }
}
.dest-pin-wrap {
  width: 32px;
  height: 40px;
  position: relative;
  animation: dest-pin-drop 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
}
.dest-pin-body {
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  background: #ef4444;
  transform: rotate(-45deg);
  position: absolute;
  top: 0;
  left: 2px;
  box-shadow: 0 4px 12px rgba(239,68,68,0.55);
  animation: dest-pin-pulse 2.2s ease-out 0.4s infinite;
}
.dest-pin-inner {
  width: 11px;
  height: 11px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 8.5px;
  left: 8.5px;
}
`;

let cssInjected = false;
function ensurePulseCSS() {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = PULSE_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

// ─── Build divIcon ─────────────────────────────────────────────────────────────

function buildDestinationIcon() {
  ensurePulseCSS();
  return L.divIcon({
    className: '',           // suppress Leaflet's default white box
    html: `
      <div class="dest-pin-wrap" aria-hidden="true">
        <div class="dest-pin-body">
          <div class="dest-pin-inner"></div>
        </div>
      </div>
    `,
    iconSize:   [32, 40],
    iconAnchor: [16, 40],   // anchor at bottom-centre of teardrop
    popupAnchor:[0, -42],   // popup opens just above the pin tip
  });
}

const destinationIcon = buildDestinationIcon();

// ─── Popup styles (inline — avoids global CSS coupling) ───────────────────────

const popupStyle = `
  .dest-popup .leaflet-popup-content-wrapper {
    background: rgba(8,11,18,0.94);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(239,68,68,0.22);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(239,68,68,0.08);
    color: #e2e8f0;
    min-width: 220px;
  }
  .dest-popup .leaflet-popup-content {
    margin: 0;
    padding: 0;
  }
  .dest-popup .leaflet-popup-tip {
    background: rgba(8,11,18,0.94);
    border: 1px solid rgba(239,68,68,0.22);
  }
  .dest-popup .leaflet-popup-tip-container {
    margin-top: -1px;
  }
`;

let popupCssInjected = false;
function ensurePopupCSS() {
  if (popupCssInjected) return;
  const style = document.createElement('style');
  style.textContent = popupStyle;
  document.head.appendChild(style);
  popupCssInjected = true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DestinationMarker() {
  const dispatch     = useDispatch();
  const destination  = useSelector((state) => state.map.destination);

  ensurePopupCSS();

  if (!destination) return null;

  const { lat, lng, name, address } = destination;

  const handleRemove = () => {
    dispatch(clearDestination());
  };

  const handleGetDirections = () => {
    dispatch(setRoutingDestination({ lat, lng, name }));
    dispatch(setActiveMapTool('route'));
    dispatch(clearDestination());
  };

  return (
    <Marker
      position={[lat, lng]}
      icon={destinationIcon}
      zIndexOffset={900}
    >
      <Popup className="dest-popup" maxWidth={280} minWidth={220}>
        <div style={{ padding: '14px 16px 12px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            {/* Red pin badge */}
            <span style={{
              flexShrink: 0,
              width: 30, height: 30,
              borderRadius: 8,
              background: 'rgba(239,68,68,0.14)',
              border: '1px solid rgba(239,68,68,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Inline SVG pin icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 13.5, fontWeight: 700,
                color: '#f1f5f9',
                lineHeight: 1.3,
                marginBottom: 3,
                wordBreak: 'break-word',
              }}>
                {name || 'Destination'}
              </div>
              {address && (
                <div style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 11.5, color: '#64748b',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}>
                  {address}
                </div>
              )}
            </div>
          </div>

          {/* Navigate here label */}
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 11, color: '#475569',
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Navigate here
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7 }}>
            {/* Remove */}
            <button
              onClick={handleRemove}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.09)',
                color: '#fca5a5',
                fontFamily: 'system-ui, sans-serif',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.09)'; }}
            >
              Remove
            </button>

            {/* Get directions */}
            <button
              onClick={handleGetDirections}
              style={{
                flex: 2,
                padding: '7px 0',
                borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.30)',
                background: 'rgba(59,130,246,0.12)',
                color: '#93c5fd',
                fontFamily: 'system-ui, sans-serif',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.22)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Get directions
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
