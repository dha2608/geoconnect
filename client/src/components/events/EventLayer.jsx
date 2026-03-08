/**
 * EventLayer.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * React-Leaflet component rendered INSIDE <MapContainer>.
 * Adds custom L.divIcon markers for each active event with a pulsing ring
 * animation keyed to the event's category colour.
 *
 * Interactions
 *   • Hover  → rich HTML tooltip (title + formatted time + category)
 *   • Click  → dispatch setSelectedEvent + openModal({ type:'eventDetail', … })
 *
 * Visibility rule: show events that have not yet ended, OR that ended within
 * the last 60 minutes (so "just-ended" events remain discoverable).
 */

import { useEffect, useRef, memo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { setSelectedEvent } from '../../features/events/eventSlice';
import { openModal }        from '../../features/ui/uiSlice';

// ─── Category config ──────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'meetup', label: 'Meetup', color: '#3b82f6', emoji: '🤝' },
  { value: 'party',  label: 'Party',  color: '#8b5cf6', emoji: '🎉' },
  { value: 'sports', label: 'Sports', color: '#10b981', emoji: '⚽' },
  { value: 'music',  label: 'Music',  color: '#ec4899', emoji: '🎵' },
  { value: 'food',   label: 'Food',   color: '#f59e0b', emoji: '🍕' },
  { value: 'other',  label: 'Other',  color: '#06b6d4', emoji: '📅' },
];

function getCat(value) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES[5];
}

// ─── One-time CSS injection ───────────────────────────────────────────────────

const STYLE_ID = 'geoconnect-event-marker-css';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = /* css */ `
    /* ── Pulse ring animation ── */
    @keyframes evtPulseRing {
      0%   { transform: scale(0.85); opacity: 0.75; }
      65%  { transform: scale(2.7);  opacity: 0;    }
      100% { transform: scale(0.85); opacity: 0;    }
    }

    /* ── Marker shell ── */
    .evt-marker {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Leaflet sets overflow:hidden on icons by default — we need visible for the ring */
      overflow: visible !important;
    }

    /* ── Expanding ring ── */
    .evt-pulse {
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      animation: evtPulseRing 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
      pointer-events: none;
    }

    /* ── Emoji circle ── */
    .evt-body {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      line-height: 1;
      border: 2px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      z-index: 2;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    .evt-body:hover {
      transform: scale(1.2);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
    }

    /* ── Tooltip overrides ── */
    .evt-tooltip {
      background: rgba(8, 11, 18, 0.94) !important;
      border: 1px solid rgba(59, 130, 246, 0.25) !important;
      border-radius: 10px !important;
      padding: 8px 12px !important;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      white-space: nowrap;
      pointer-events: none !important;
    }

    /* Leaflet arrow — tint to match border */
    .leaflet-tooltip-top.evt-tooltip::before {
      border-top-color: rgba(59, 130, 246, 0.25) !important;
    }
  `;
  document.head.appendChild(el);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Display an event if it hasn't ended, or ended within the last 60 minutes.
 */
function isVisible(event) {
  if (!event.location?.coordinates) return false;     // No geo-data — skip
  if (!event.endTime) return true;                     // No end time — always show
  const end = new Date(event.endTime).getTime();
  return end >= Date.now() - 60 * 60 * 1000;
}

function buildIcon(event) {
  const { color, emoji } = getCat(event.category);
  const bg   = `${color}cc`;   // 80% opacity fill
  const ring = `${color}55`;   // 33% opacity for the pulse ring

  return L.divIcon({
    className: '',             // Clear Leaflet's default white-box class
    html: `
      <div class="evt-marker">
        <div class="evt-pulse" style="background:${ring};"></div>
        <div class="evt-body"  style="background:${bg};" aria-label="${event.title.replace(/"/g, '&quot;')}">
          ${emoji}
        </div>
      </div>`,
    iconSize:      [44, 44],
    iconAnchor:    [22, 22],   // Centre of the circle on the lat/lng point
    tooltipAnchor: [0, -26],   // Above the icon
  });
}

function buildTooltip(event) {
  const { emoji, label, color } = getCat(event.category);
  const attendees = event.attendees?.length ?? 0;
  const timeStr   = event.startTime
    ? format(new Date(event.startTime), 'EEE, MMM d · h:mm a')
    : '';

  return /* html */ `
    <div style="font-family:'DM Sans',sans-serif;min-width:160px;">
      <div style="font-weight:700;color:#f1f5f9;font-size:13px;margin-bottom:4px;max-width:220px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${event.title}
      </div>
      ${timeStr ? `<div style="color:#94a3b8;font-size:11px;margin-bottom:5px;">${timeStr}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;background:${color}22;color:${color};
                     padding:1px 7px;border-radius:99px;border:1px solid ${color}44;">
          ${emoji} ${label}
        </span>
        ${attendees > 0
          ? `<span style="font-size:11px;color:#475569;">👥 ${attendees}</span>`
          : ''}
      </div>
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EventLayer = memo(function EventLayer() {
  const dispatch = useDispatch();
  const map      = useMap();

  const events   = useSelector((state) => state.events.events);

  /** Reusable LayerGroup — added to map once, cleared on each events update. */
  const layerRef = useRef(null);

  // Inject shared CSS once on first render
  useEffect(() => { injectStyles(); }, []);

  // Create the LayerGroup and attach it to the map on mount
  useEffect(() => {
    const group = L.layerGroup();
    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
    };
  }, [map]);

  // Sync markers whenever the events array changes
  useEffect(() => {
    if (!layerRef.current) return;

    layerRef.current.clearLayers();

    events.filter(isVisible).forEach((event) => {
      const [lng, lat] = event.location.coordinates;

      const marker = L.marker([lat, lng], {
        icon:         buildIcon(event),
        zIndexOffset: 1000,          // Above regular map pins (pins use default 0)
        riseOnHover:  true,
        title:        event.title,   // Native browser tooltip / a11y
      });

      marker.bindTooltip(buildTooltip(event), {
        permanent:  false,
        direction:  'top',
        className:  'evt-tooltip',
        opacity:    1,
      });

      marker.on('click', () => {
        dispatch(setSelectedEvent(event));
        dispatch(openModal({ type: 'eventDetail', data: { eventId: event._id } }));
      });

      layerRef.current.addLayer(marker);
    });
  }, [events, dispatch]);   // map is stable after mount — no need in deps

  return null;  // Pure side-effect component
});

EventLayer.displayName = 'EventLayer';
export default EventLayer;
