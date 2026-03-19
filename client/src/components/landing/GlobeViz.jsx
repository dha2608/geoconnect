import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';
import { motion } from 'framer-motion';

// City markers with real lat/lng coordinates
const CITIES = [
  { name: 'Paris', lat: 48.86, lng: 2.35, color: [0.23, 0.51, 0.96], size: 0.08 },
  { name: 'Tokyo', lat: 35.68, lng: 139.65, color: [0.55, 0.36, 0.96], size: 0.08 },
  { name: 'New York', lat: 40.71, lng: -74.01, color: [0.02, 0.71, 0.83], size: 0.08 },
  { name: 'Sydney', lat: -33.87, lng: 151.21, color: [0.06, 0.73, 0.51], size: 0.06 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, color: [0.96, 0.62, 0.04], size: 0.06 },
  { name: 'Dubai', lat: 25.20, lng: 55.27, color: [0.94, 0.27, 0.27], size: 0.05 },
  { name: 'Seoul', lat: 37.57, lng: 126.98, color: [0.55, 0.36, 0.96], size: 0.05 },
  { name: 'London', lat: 51.51, lng: -0.13, color: [0.23, 0.51, 0.96], size: 0.05 },
  { name: 'Lagos', lat: 6.52, lng: 3.38, color: [0.06, 0.73, 0.51], size: 0.05 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88, color: [0.96, 0.62, 0.04], size: 0.05 },
];

// Convert cities to cobe marker format
const MARKERS = CITIES.map((city) => ({
  location: [city.lat, city.lng],
  size: city.size,
  color: city.color,
}));

export default function GlobeViz({ mouseX, mouseY, size = 420 }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const globeRef = useRef(null);

  // Handle mouse drag for manual rotation
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
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = 0;

    const onResize = () => {
      if (canvas) {
        width = canvas.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.8,
      mapSamples: 20000,
      mapBrightness: 4,
      mapBaseBrightness: 0.02,
      baseColor: [0.05, 0.08, 0.18],
      markerColor: [0.23, 0.51, 0.96],
      glowColor: [0.08, 0.15, 0.35],
      markers: MARKERS,
      opacity: 0.92,
      scale: 1.02,
      onRender: (state) => {
        // Auto-rotation (pauses during drag)
        if (pointerInteracting.current === null) {
          phiRef.current += 0.003;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current / 200;

        // Subtle tilt from mouse position (from parent motion values)
        if (mouseY && typeof mouseY.get === 'function') {
          state.theta = 0.25 + mouseY.get() * 0.0004;
        }

        state.width = width * 2;
        state.height = width * 2;
      },
    });

    globeRef.current = globe;

    // Fade in
    setTimeout(() => {
      if (canvas) canvas.style.opacity = '1';
    }, 100);

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-16 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.04) 35%, transparent 60%)',
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
          width: '100%',
          height: '100%',
          contain: 'layout paint size',
          opacity: 0,
          transition: 'opacity 1s ease',
          cursor: 'grab',
          borderRadius: '50%',
        }}
      />

      {/* Atmospheric ring overlay */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 40px rgba(59,130,246,0.06), 0 0 60px rgba(59,130,246,0.04), 0 0 120px rgba(139,92,246,0.02)',
        }}
      />
    </motion.div>
  );
}
