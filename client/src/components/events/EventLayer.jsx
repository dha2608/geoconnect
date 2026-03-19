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
import { setSelectedEvent, selectAllEvents } from '../../features/events/eventSlice';
import { openModal }        from '../../features/ui/uiSlice';

// ─── Category config ──────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'meetup', label: 'Meetup', color: '#3b82f6' },
  { value: 'party',  label: 'Party',  color: '#8b5cf6' },
  { value: 'sports', label: 'Sports', color: '#10b981' },
  { value: 'music',  label: 'Music',  color: '#ec4899' },
  { value: 'food',   label: 'Food',   color: '#f59e0b' },
  { value: 'other',  label: 'Other',  color: '#06b6d4' },
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
    /* ── Marker shell ── */
    .evt-marker {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }

    /* ── Simple colored dot ── */
    .evt-body {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      transition: transform 0.15s ease;
      z-index: 2;
    }

    .evt-body:hover {
      transform: scale(1.3);
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
  const { color } = getCat(event.category);

  return L.divIcon({
    className: '',             // Clear Leaflet's default white-box class
    html: `
      <div class="evt-marker">
        <div class="evt-body" style="background:${color};" aria-label="${event.title.replace(/"/g, '&quot;')}"></div>
      </div>`,
    iconSize:      [20, 20],
    iconAnchor:    [10, 10],   // Centre of the dot on the lat/lng point
    tooltipAnchor: [0, -14],   // Above the icon
  });
}

function buildTooltip(event) {
  const { label, color } = getCat(event.category);
  const attendees = event.attendees?.length ?? 0;
  const timeStr   = event.startTime
    ? format(new Date(event.startTime), 'EEE, MMM d · h:mm a')
    : '';

  return /* html */ `
    <div style="font-family:'Nunito',sans-serif;min-width:160px;">
      <div style="font-weight:700;color:#f1f5f9;font-size:13px;margin-bottom:4px;max-width:220px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${event.title}
      </div>
      ${timeStr ? `<div style="color:#94a3b8;font-size:11px;margin-bottom:5px;">${timeStr}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;background:${color}22;color:${color};
                     padding:1px 7px;border-radius:99px;border:1px solid ${color}44;">
          ${label}
        </span>
        ${attendees > 0
          ? `<span style="font-size:11px;color:#475569;">${attendees} attending</span>`
          : ''}
      </div>
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EventLayer = memo(function EventLayer() {
  const dispatch = useDispatch();
  const map      = useMap();

  const events   = useSelector(selectAllEvents);

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
