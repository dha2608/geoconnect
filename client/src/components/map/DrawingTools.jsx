import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { polygon as turfPolygon, area as turfArea, length as turfLength, lineString as turfLineString } from '@turf/turf';
import toast from 'react-hot-toast';

const SHAPE_TOOLS = [
  { key: 'polygon', label: 'Polygon', icon: '⬠' },
  { key: 'circle', label: 'Circle', icon: '○' },
  { key: 'rectangle', label: 'Rectangle', icon: '▭' },
];

const ZONE_COLORS = [
  { key: 'blue', hex: '#3b82f6', label: 'Blue' },
  { key: 'green', hex: '#10b981', label: 'Green' },
  { key: 'red', hex: '#ef4444', label: 'Red' },
  { key: 'purple', hex: '#8b5cf6', label: 'Purple' },
  { key: 'orange', hex: '#f59e0b', label: 'Orange' },
  { key: 'cyan', hex: '#06b6d4', label: 'Cyan' },
];

const STORAGE_KEY = 'geoconnect:saved_zones';

function getDrawStyle(color = '#3b82f6') {
  return {
    color,
    weight: 2,
    fillColor: color,
    fillOpacity: 0.15,
    dashArray: null,
  };
}

const DRAW_STYLE = getDrawStyle();

const VERTEX_ICON = L.divIcon({
  className: '',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
  html: '<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 6px rgba(59,130,246,0.5);"></div>',
});

function formatArea(m2) {
  return m2 < 10000
    ? `${m2.toFixed(1)} m²`
    : `${(m2 / 1e6).toFixed(3)} km²`;
}

function formatLength(m) {
  return m < 1000
    ? `${m.toFixed(1)} m`
    : `${(m / 1000).toFixed(2)} km`;
}

/* ─── Zone persistence helpers ──────────────────────────────────────────── */

function loadSavedZones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistZones(zones) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(zones)); } catch { /* quota */ }
}

function zoneToLeafletLayer(zone, map) {
  const style = getDrawStyle(zone.color);
  if (zone.shapeType === 'polygon') {
    return L.polygon(zone.latlngs, style).addTo(map);
  } else if (zone.shapeType === 'circle') {
    return L.circle(zone.center, { radius: zone.radius, ...style }).addTo(map);
  } else if (zone.shapeType === 'rectangle') {
    return L.rectangle(zone.bounds, style).addTo(map);
  }
  return null;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function DrawingTools({ onClose }) {
  const map = useMap();
  const [shapeTool, setShapeTool] = useState(null);
  const [vertices, setVertices] = useState([]);
  const [info, setInfo] = useState(null);
  const [savedZones, setSavedZones] = useState(() => loadSavedZones());
  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0].hex);
  const [showSaved, setShowSaved] = useState(false);
  const layersRef = useRef([]);
  const savedLayersRef = useRef([]);
  const vertexMarkersRef = useRef([]);
  const previewRef = useRef(null);
  const circleStartRef = useRef(null);
  const rectStartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const clearPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.remove();
      previewRef.current = null;
    }
  }, []);

  const clearVertexMarkers = useCallback(() => {
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];
  }, []);

  const addVertexMarker = useCallback(
    (latlng) => {
      const m = L.marker(latlng, { icon: VERTEX_ICON }).addTo(map);
      vertexMarkersRef.current.push(m);
    },
    [map]
  );

  const finalizeShape = useCallback(
    (layer, type) => {
      layer.addTo(map);
      layersRef.current.push(layer);

      let area = 0;
      let perimeter = 0;
      let geoData = {};

      if (type === 'polygon') {
        const coords = layer.getLatLngs()[0].map((ll) => [ll.lng, ll.lat]);
        coords.push(coords[0]);
        const poly = turfPolygon([coords]);
        area = turfArea(poly);
        perimeter = turfLength(turfLineString(coords), { units: 'meters' });
        geoData = { latlngs: layer.getLatLngs()[0].map((ll) => [ll.lat, ll.lng]) };
      } else if (type === 'circle') {
        const r = layer.getRadius();
        area = Math.PI * r * r;
        perimeter = 2 * Math.PI * r;
        const c = layer.getLatLng();
        geoData = { center: [c.lat, c.lng], radius: r };
      } else if (type === 'rectangle') {
        const bounds = layer.getBounds();
        const coords = [
          [bounds.getWest(), bounds.getSouth()],
          [bounds.getEast(), bounds.getSouth()],
          [bounds.getEast(), bounds.getNorth()],
          [bounds.getWest(), bounds.getNorth()],
          [bounds.getWest(), bounds.getSouth()],
        ];
        const poly = turfPolygon([coords]);
        area = turfArea(poly);
        perimeter = turfLength(turfLineString(coords), { units: 'meters' });
        geoData = { bounds: [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]] };
      }

      setInfo({ type, area, perimeter, geoData });
      clearPreview();
      clearVertexMarkers();
      setVertices([]);
      setShapeTool(null);
    },
    [map, clearPreview, clearVertexMarkers]
  );

  useEffect(() => {
    if (!shapeTool) return;

    const handleClick = (e) => {
      const { latlng } = e;

      if (shapeTool === 'polygon') {
        setVertices((prev) => [...prev, latlng]);
        addVertexMarker(latlng);
      } else if (shapeTool === 'circle') {
        if (!circleStartRef.current) {
          circleStartRef.current = latlng;
          addVertexMarker(latlng);
        } else {
          const radius = circleStartRef.current.distanceTo(latlng);
          const circle = L.circle(circleStartRef.current, {
            radius,
            ...DRAW_STYLE,
          });
          finalizeShape(circle, 'circle');
          circleStartRef.current = null;
        }
      } else if (shapeTool === 'rectangle') {
        if (!rectStartRef.current) {
          rectStartRef.current = latlng;
          addVertexMarker(latlng);
        } else {
          const bounds = L.latLngBounds(rectStartRef.current, latlng);
          const rect = L.rectangle(bounds, DRAW_STYLE);
          finalizeShape(rect, 'rectangle');
          rectStartRef.current = null;
        }
      }
    };

    const handleDblClick = (e) => {
      L.DomEvent.stopPropagation(e);
      if (shapeTool === 'polygon' && vertices.length >= 3) {
        const polygon = L.polygon(vertices, DRAW_STYLE);
        finalizeShape(polygon, 'polygon');
      }
    };

    const handleMouseMove = (e) => {
      if (shapeTool === 'polygon' && vertices.length > 0) {
        clearPreview();
        const pts = [...vertices.map((v) => [v.lat, v.lng]), [e.latlng.lat, e.latlng.lng]];
        previewRef.current = L.polyline(pts, {
          color: '#3b82f6',
          weight: 2,
          dashArray: '6,6',
          opacity: 0.6,
        }).addTo(map);
      } else if (shapeTool === 'circle' && circleStartRef.current) {
        clearPreview();
        const radius = circleStartRef.current.distanceTo(e.latlng);
        previewRef.current = L.circle(circleStartRef.current, {
          radius,
          ...DRAW_STYLE,
          fillOpacity: 0.08,
          dashArray: '6,6',
        }).addTo(map);
      } else if (shapeTool === 'rectangle' && rectStartRef.current) {
        clearPreview();
        const bounds = L.latLngBounds(rectStartRef.current, e.latlng);
        previewRef.current = L.rectangle(bounds, {
          ...DRAW_STYLE,
          fillOpacity: 0.08,
          dashArray: '6,6',
        }).addTo(map);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);
    map.on('mousemove', handleMouseMove);
    map.doubleClickZoom.disable();

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      map.off('mousemove', handleMouseMove);
      map.doubleClickZoom.enable();
      clearPreview();
      clearVertexMarkers();
    };
  }, [shapeTool, vertices, map, addVertexMarker, finalizeShape, clearPreview, clearVertexMarkers]);

  const clearAll = () => {
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    clearPreview();
    clearVertexMarkers();
    setVertices([]);
    setInfo(null);
    setZoneName('');
    circleStartRef.current = null;
    rectStartRef.current = null;
  };

  /* ── Save current zone ────────────────────────────────────────────────── */
  const handleSaveZone = () => {
    if (!info) return;
    const name = zoneName.trim() || `Zone ${savedZones.length + 1}`;
    const zone = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      color: zoneColor,
      shapeType: info.type,
      area: info.area,
      perimeter: info.perimeter,
      createdAt: new Date().toISOString(),
      ...info.geoData,
    };
    const updated = [...savedZones, zone];
    setSavedZones(updated);
    persistZones(updated);
    setZoneName('');
    toast.success(`Zone "${name}" saved!`);
  };

  const handleDeleteZone = (zoneId) => {
    const updated = savedZones.filter((z) => z.id !== zoneId);
    setSavedZones(updated);
    persistZones(updated);
    // Remove from map if rendered
    const idx = savedZones.findIndex((z) => z.id === zoneId);
    if (savedLayersRef.current[idx]) {
      savedLayersRef.current[idx].remove();
      savedLayersRef.current.splice(idx, 1);
    }
  };

  const handleShowZone = (zone) => {
    const layer = zoneToLeafletLayer(zone, map);
    if (layer) {
      savedLayersRef.current.push(layer);
      if (layer.getBounds) map.fitBounds(layer.getBounds(), { padding: [40, 40] });
      else if (zone.center) map.setView(zone.center, 14);
    }
  };

  const handleClearSavedLayers = () => {
    savedLayersRef.current.forEach((l) => l.remove());
    savedLayersRef.current = [];
  };

  useEffect(() => {
    return () => {
      layersRef.current.forEach((l) => l.remove());
      savedLayersRef.current.forEach((l) => l.remove());
      clearPreview();
      clearVertexMarkers();
    };
  }, [clearPreview, clearVertexMarkers]);

  return (
    <div
      ref={containerRef}
      className="glass rounded-xl px-4 py-3 min-w-[280px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-txt-primary font-heading">Drawing Tools</span>
        <button
          onClick={onClose}
          className="text-txt-muted hover:text-txt-secondary transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Shape Buttons */}
      <div className="flex gap-1.5 mb-3">
        {SHAPE_TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setShapeTool(t.key);
              setVertices([]);
              clearPreview();
              clearVertexMarkers();
              circleStartRef.current = null;
              rectStartRef.current = null;
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              shapeTool === t.key
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'bg-surface-hover text-txt-muted hover:text-txt-secondary hover:bg-surface-active'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      {shapeTool && (
        <p className="text-xs text-txt-muted mb-3">
          {shapeTool === 'polygon' && `Click to add points, double-click to close. (${vertices.length} pts)`}
          {shapeTool === 'circle' && (circleStartRef.current ? 'Click to set radius' : 'Click to set center')}
          {shapeTool === 'rectangle' && (rectStartRef.current ? 'Click to set opposite corner' : 'Click to set first corner')}
        </p>
      )}

      {/* Info */}
      {info && (
        <div className="bg-surface-hover rounded-lg px-3 py-2 mb-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Shape</span>
            <span className="text-txt-primary font-medium capitalize">{info.type}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Area</span>
            <span className="text-accent-primary font-mono">{formatArea(info.area)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Perimeter</span>
            <span className="text-accent-secondary font-mono">{formatLength(info.perimeter)}</span>
          </div>
        </div>
      )}

      {/* Save Zone Section */}
      {info && (
        <div className="bg-surface-hover rounded-lg px-3 py-2.5 mb-3 space-y-2">
          <p className="text-[10px] font-bold tracking-widest text-txt-muted uppercase">Save as Zone</p>
          <input
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder={`Zone ${savedZones.length + 1}`}
            maxLength={40}
            className="w-full bg-surface-active border border-surface-divider rounded-lg px-2.5 py-1.5 text-xs text-txt-primary placeholder:text-txt-muted outline-none focus:border-accent-primary/40 transition-colors"
          />
          <div className="flex gap-1">
            {ZONE_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setZoneColor(c.hex)}
                title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  zoneColor === c.hex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <button
            onClick={handleSaveZone}
            className="w-full py-1.5 text-xs font-medium text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 rounded-lg transition-colors"
          >
            💾 Save Zone
          </button>
        </div>
      )}

      {/* Saved Zones Toggle */}
      {savedZones.length > 0 && (
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="w-full flex items-center justify-between py-1.5 px-2 mb-2 text-xs font-medium text-txt-secondary bg-surface-hover hover:bg-surface-active rounded-lg transition-colors"
        >
          <span>📌 Saved Zones ({savedZones.length})</span>
          <svg className={`w-3 h-3 transition-transform ${showSaved ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      )}

      {/* Saved Zones List */}
      {showSaved && savedZones.length > 0 && (
        <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
          {savedZones.map((zone) => (
            <div key={zone.id} className="flex items-center gap-2 px-2 py-1.5 bg-surface-hover rounded-lg group">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
              <span className="text-xs text-txt-primary truncate flex-1">{zone.name}</span>
              <button
                onClick={() => handleShowZone(zone)}
                title="Show on map"
                className="text-txt-muted hover:text-accent-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                👁
              </button>
              <button
                onClick={() => handleDeleteZone(zone.id)}
                title="Delete zone"
                className="text-txt-muted hover:text-accent-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={handleClearSavedLayers}
            className="w-full py-1 text-[10px] text-txt-muted hover:text-txt-secondary transition-colors"
          >
            Hide all from map
          </button>
        </div>
      )}

      {/* Clear All */}
      <button
        onClick={clearAll}
        className="w-full py-1.5 text-xs font-medium text-txt-muted hover:text-accent-danger bg-surface-hover hover:bg-accent-danger/10 rounded-lg transition-colors"
      >
        Clear All
      </button>
    </div>
  );
}
