import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import L from 'leaflet';

// ---------------------------------------------------------------------------
// Colour ramp – used to map a [0, 1] heat value → RGBA
// Built once at module load time on a hidden 256-px canvas.
// ---------------------------------------------------------------------------
const buildColorRamp = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  // blue → cyan → green → yellow → red
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0.0,  'rgba(0,   0,   255, 0)');   // transparent blue (cold)
  gradient.addColorStop(0.2,  'rgba(0,   0,   255, 1)');   // blue
  gradient.addColorStop(0.4,  'rgba(0,   255, 255, 1)');   // cyan
  gradient.addColorStop(0.6,  'rgba(0,   255, 0,   1)');   // green
  gradient.addColorStop(0.8,  'rgba(255, 255, 0,   1)');   // yellow
  gradient.addColorStop(1.0,  'rgba(255, 0,   0,   1)');   // red
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  // Pull the raw pixel data so we can look up colours by index (0-255)
  return ctx.getImageData(0, 0, 256, 1).data; // Uint8ClampedArray, length 1024
};

let colorRampData = null; // lazy-init so it runs in a browser context

/**
 * Map a normalised intensity [0, 1] → [r, g, b, a] from the colour ramp.
 */
const intensityToColor = (t) => {
  if (!colorRampData) colorRampData = buildColorRamp();
  const idx = Math.min(255, Math.round(t * 255)) * 4;
  return [
    colorRampData[idx],
    colorRampData[idx + 1],
    colorRampData[idx + 2],
    colorRampData[idx + 3],
  ];
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * HeatmapLayer
 *
 * Must be rendered inside a <MapContainer>.  Reads pin locations from Redux
 * and draws a canvas-based heatmap overlay directly on the Leaflet map pane.
 *
 * @param {boolean} visible     – show / hide the layer
 * @param {number}  radius      – base radius of each heat point (px)
 * @param {number}  blur        – gaussian blur spread (px)
 * @param {number}  maxOpacity  – maximum opacity of the finished heat layer
 */
export default function HeatmapLayer({
  visible = true,
  radius = 25,
  blur = 15,
  maxOpacity = 0.6,
}) {
  const map = useMap();
  const pins = useSelector((state) => state.pins.pins);

  // Refs so callbacks always see the latest values without re-registering
  const canvasRef    = useRef(null);
  const animFrameRef = useRef(null);   // pending requestAnimationFrame id
  const pendingRef   = useRef(false);  // true while a redraw is scheduled

  // Keep a ref to the latest prop values so the draw function is stable
  const propsRef = useRef({ visible, radius, blur, maxOpacity });
  useEffect(() => {
    propsRef.current = { visible, radius, blur, maxOpacity };
  }, [visible, radius, blur, maxOpacity]);

  // Keep a ref to the latest pins so the draw function is stable
  const pinsRef = useRef(pins);
  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  // -------------------------------------------------------------------------
  // Core draw function – pure canvas operations, no React state
  // -------------------------------------------------------------------------
  const draw = useCallback(() => {
    pendingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { visible, radius, blur, maxOpacity } = propsRef.current;
    const currentPins = pinsRef.current;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (!visible || !currentPins || currentPins.length === 0) return;

    // ------------------------------------------------------------------
    // Pass 1 – draw additive gaussian "blobs" on an off-screen canvas
    // using globalCompositeOperation:'lighter' so overlapping pins stack.
    // ------------------------------------------------------------------
    const offscreen = document.createElement('canvas');
    offscreen.width  = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    offCtx.globalCompositeOperation = 'lighter';

    const effectiveRadius = radius + blur;
    const mapBounds = map.getBounds();

    currentPins.forEach((pin) => {
      const coords = pin?.location?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;

      const [lng, lat] = coords; // GeoJSON order

      // Skip pins outside the current viewport (with padding for bleed)
      if (!mapBounds.pad(0.1).contains([lat, lng])) return;

      const point = map.latLngToContainerPoint([lat, lng]);

      // Radial gradient: bright white at centre → transparent at edge
      const grad = offCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, effectiveRadius,
      );
      grad.addColorStop(0,   'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(1,   'rgba(255, 255, 255, 0)');

      offCtx.beginPath();
      offCtx.arc(point.x, point.y, effectiveRadius, 0, Math.PI * 2);
      offCtx.fillStyle = grad;
      offCtx.fill();
    });

    // ------------------------------------------------------------------
    // Pass 2 – colourise: read offscreen pixel data, map intensity → colour
    // ------------------------------------------------------------------
    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // The red channel from the white blob encodes intensity (0-255)
      const intensity = data[i] / 255;
      if (intensity === 0) continue;

      const [r, g, b, a] = intensityToColor(intensity);
      data[i]     = r;
      data[i + 1] = g;
      data[i + 2] = b;
      // Preserve the alpha from the colour ramp, scaled by the blob alpha
      data[i + 3] = Math.round(a * (data[i + 3] / 255));
    }

    // ------------------------------------------------------------------
    // Pass 3 – composite colourised layer onto the visible canvas
    // ------------------------------------------------------------------
    offCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = maxOpacity;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }, [map]); // map is stable for the lifetime of the component

  // -------------------------------------------------------------------------
  // Debounced redraw – schedule via rAF, cancel previous if still pending
  // -------------------------------------------------------------------------
  const scheduleDraw = useCallback(() => {
    if (pendingRef.current) return; // already queued
    pendingRef.current = true;
    animFrameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // -------------------------------------------------------------------------
  // Mount / unmount – create canvas, attach to Leaflet overlay pane
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Create canvas and size it to the map container
    const container = map.getContainer();
    const canvas = L.DomUtil.create('canvas', 'heatmap-canvas');

    const resize = () => {
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();

    // Position canvas to cover the entire map container
    canvas.style.position = 'absolute';
    canvas.style.top      = '0';
    canvas.style.left     = '0';
    canvas.style.pointerEvents = 'none'; // pass-through for mouse events
    canvas.style.zIndex   = '400';       // above tile panes, below controls

    // Prevent click events from leaking through canvas borders
    L.DomEvent.disableClickPropagation(canvas);

    // Attach to the Leaflet overlay pane so it participates in transforms
    const pane = map.getPane('overlayPane');
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    // Resize canvas when the browser window resizes
    const resizeObserver = new ResizeObserver(() => {
      resize();
      scheduleDraw();
    });
    resizeObserver.observe(container);

    // Register Leaflet map event listeners
    map.on('moveend',  scheduleDraw);
    map.on('zoomend',  scheduleDraw);
    map.on('resize',   scheduleDraw);

    // Initial draw
    scheduleDraw();

    // Cleanup on unmount
    return () => {
      map.off('moveend',  scheduleDraw);
      map.off('zoomend',  scheduleDraw);
      map.off('resize',   scheduleDraw);

      resizeObserver.disconnect();

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }

      canvasRef.current = null;
    };
  }, [map, scheduleDraw]);

  // -------------------------------------------------------------------------
  // Redraw whenever pins, visibility, or style props change
  // -------------------------------------------------------------------------
  useEffect(() => {
    scheduleDraw();
  }, [pins, visible, radius, blur, maxOpacity, scheduleDraw]);

  // This component renders no DOM of its own – everything lives on the canvas
  return null;
}
