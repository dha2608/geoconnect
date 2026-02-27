import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

const SHAPE_TOOLS = [
  { key: 'polygon', label: 'Polygon', icon: '⬠' },
  { key: 'circle', label: 'Circle', icon: '○' },
  { key: 'rectangle', label: 'Rectangle', icon: '▭' },
];

const DRAW_STYLE = {
  color: '#3b82f6',
  weight: 2,
  fillColor: '#3b82f6',
  fillOpacity: 0.15,
  dashArray: null,
};

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

export default function DrawingTools({ onClose }) {
  const map = useMap();
  const [shapeTool, setShapeTool] = useState(null);
  const [vertices, setVertices] = useState([]);
  const [info, setInfo] = useState(null);
  const layersRef = useRef([]);
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

      if (type === 'polygon') {
        const coords = layer.getLatLngs()[0].map((ll) => [ll.lng, ll.lat]);
        coords.push(coords[0]);
        const poly = turf.polygon([coords]);
        area = turf.area(poly);
        perimeter = turf.length(turf.lineString(coords), { units: 'meters' });
      } else if (type === 'circle') {
        const r = layer.getRadius();
        area = Math.PI * r * r;
        perimeter = 2 * Math.PI * r;
      } else if (type === 'rectangle') {
        const bounds = layer.getBounds();
        const coords = [
          [bounds.getWest(), bounds.getSouth()],
          [bounds.getEast(), bounds.getSouth()],
          [bounds.getEast(), bounds.getNorth()],
          [bounds.getWest(), bounds.getNorth()],
          [bounds.getWest(), bounds.getSouth()],
        ];
        const poly = turf.polygon([coords]);
        area = turf.area(poly);
        perimeter = turf.length(turf.lineString(coords), { units: 'meters' });
      }

      setInfo({ type, area, perimeter });
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
    circleStartRef.current = null;
    rectStartRef.current = null;
  };

  useEffect(() => {
    return () => {
      layersRef.current.forEach((l) => l.remove());
      clearPreview();
      clearVertexMarkers();
    };
  }, [clearPreview, clearVertexMarkers]);

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
                : 'bg-white/5 text-txt-muted hover:text-txt-secondary hover:bg-white/10'
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
        <div className="bg-white/5 rounded-lg px-3 py-2 mb-3 space-y-1">
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

      {/* Clear All */}
      <button
        onClick={clearAll}
        className="w-full py-1.5 text-xs font-medium text-txt-muted hover:text-accent-danger bg-white/5 hover:bg-accent-danger/10 rounded-lg transition-colors"
      >
        Clear All
      </button>
    </div>
  );
}
