import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';
import { motion } from 'framer-motion';

// City markers with real lat/lng coordinates
const MARKERS = [
  { location: [48.86, 2.35], size: 0.07 },      // Paris
  { location: [35.68, 139.65], size: 0.07 },     // Tokyo
  { location: [40.71, -74.01], size: 0.07 },     // New York
  { location: [-33.87, 151.21], size: 0.05 },    // Sydney
  { location: [-23.55, -46.63], size: 0.05 },    // São Paulo
  { location: [25.20, 55.27], size: 0.04 },      // Dubai
  { location: [37.57, 126.98], size: 0.04 },     // Seoul
  { location: [51.51, -0.13], size: 0.05 },      // London
  { location: [6.52, 3.38], size: 0.04 },        // Lagos
  { location: [19.08, 72.88], size: 0.04 },      // Mumbai
  { location: [10.76, 106.66], size: 0.06 },     // Ho Chi Minh City
];

export default function GlobeViz({ mouseY, size = 420 }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  const handlePointerDown = useCallback((e) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  const handlePointerOut = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (pointerInteracting.current !== null) {
      pointerInteractionMovement.current = e.clientX - pointerInteracting.current;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use fixed pixel size based on prop — never rely on offsetWidth at mount
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const canvasWidth = size * pixelRatio;

    const globe = createGlobe(canvas, {
      devicePixelRatio: pixelRatio,
      width: canvasWidth,
      height: canvasWidth,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: MARKERS,
      onRender: (state) => {
        // Auto-rotation (pauses during drag)
        if (pointerInteracting.current === null) {
          phiRef.current += 0.003;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current / 200;

        // Subtle tilt from parent mouse position
        if (mouseY && typeof mouseY.get === 'function') {
          state.theta = 0.3 + mouseY.get() * 0.0003;
        }
      },
    });

    // Fade in after first frame renders
    requestAnimationFrame(() => {
      if (canvas) canvas.style.opacity = '1';
    });

    return () => globe.destroy();
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Soft ambient glow behind globe */}
      <div
        className="absolute -inset-20 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.05) 30%, transparent 55%)',
        }}
      />

      {/* Globe canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
        style={{
          width: size,
          height: size,
          opacity: 0,
          transition: 'opacity 0.8s ease',
          cursor: 'grab',
        }}
      />
    </motion.div>
  );
}
