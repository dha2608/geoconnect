import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';
import { motion } from 'framer-motion';

/* ── City markers ────────────────────────────────────────────────── */
const MARKERS = [
  { location: [48.86, 2.35], size: 0.06 },      // Paris
  { location: [35.68, 139.65], size: 0.06 },     // Tokyo
  { location: [40.71, -74.01], size: 0.07 },     // New York
  { location: [-33.87, 151.21], size: 0.05 },    // Sydney
  { location: [-23.55, -46.63], size: 0.05 },    // São Paulo
  { location: [25.20, 55.27], size: 0.04 },      // Dubai
  { location: [37.57, 126.98], size: 0.05 },     // Seoul
  { location: [51.51, -0.13], size: 0.06 },      // London
  { location: [6.52, 3.38], size: 0.04 },        // Lagos
  { location: [19.08, 72.88], size: 0.05 },      // Mumbai
  { location: [10.76, 106.66], size: 0.06 },     // Ho Chi Minh City
  { location: [1.35, 103.82], size: 0.04 },      // Singapore
  { location: [55.76, 37.62], size: 0.05 },      // Moscow
  { location: [-1.29, 36.82], size: 0.04 },      // Nairobi
];

/* ── Connection arcs between cities ──────────────────────────────── */
const ARCS = [
  { from: [40.71, -74.01], to: [51.51, -0.13] },    // NY → London
  { from: [51.51, -0.13], to: [48.86, 2.35] },      // London → Paris
  { from: [48.86, 2.35], to: [25.20, 55.27] },      // Paris → Dubai
  { from: [25.20, 55.27], to: [19.08, 72.88] },     // Dubai → Mumbai
  { from: [19.08, 72.88], to: [1.35, 103.82] },     // Mumbai → Singapore
  { from: [1.35, 103.82], to: [10.76, 106.66] },    // Singapore → HCM City
  { from: [10.76, 106.66], to: [35.68, 139.65] },   // HCM City → Tokyo
  { from: [35.68, 139.65], to: [37.57, 126.98] },   // Tokyo → Seoul
  { from: [-23.55, -46.63], to: [6.52, 3.38] },     // São Paulo → Lagos
  { from: [6.52, 3.38], to: [-1.29, 36.82] },       // Lagos → Nairobi
  { from: [40.71, -74.01], to: [-23.55, -46.63] },  // NY → São Paulo
  { from: [55.76, 37.62], to: [35.68, 139.65] },    // Moscow → Tokyo
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

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const canvasWidth = size * pixelRatio;

    const globe = createGlobe(canvas, {
      devicePixelRatio: pixelRatio,
      width: canvasWidth,
      height: canvasWidth,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 2.5,
      mapSamples: 40000,
      mapBrightness: 2.5,
      mapBaseBrightness: 0.05,
      baseColor: [0.4, 0.65, 1],
      markerColor: [0.1, 0.8, 1],
      glowColor: [0.27, 0.58, 0.90],
      markers: MARKERS,
      scale: 1.05,
      opacity: 0.92,
      // Connection arcs (cobe v2)
      arcs: ARCS,
      arcColor: [0.3, 0.7, 1],
      arcAltitude: 0.15,
      arcWidth: 0.4,
      arcDashGap: 0.6,
      arcDashLength: 0.4,
      arcDashAnimateTime: 4000,
    });

    // Own animation loop (cobe v2 has no onRender)
    let animationId;
    function animate() {
      if (pointerInteracting.current === null) {
        phiRef.current += 0.002;
      }

      const phi = phiRef.current + pointerInteractionMovement.current / 200;
      const theta = mouseY && typeof mouseY.get === 'function'
        ? 0.25 + mouseY.get() * 0.0003
        : 0.25;

      globe.update({ phi, theta });
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    // Fade in
    setTimeout(() => {
      if (canvas) canvas.style.opacity = '1';
    }, 300);

    return () => {
      cancelAnimationFrame(animationId);
      globe.destroy();
    };
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Multi-layer atmospheric glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-15%',
          background: 'radial-gradient(circle, rgba(56,130,246,0.12) 0%, rgba(56,130,246,0.04) 40%, transparent 65%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '-25%',
          background: 'radial-gradient(circle, rgba(100,120,240,0.06) 0%, rgba(139,92,246,0.02) 35%, transparent 55%)',
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
          transition: 'opacity 1s ease',
          cursor: 'grab',
        }}
      />

      {/* Inner atmospheric ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `
            inset 0 0 50px rgba(56,130,246,0.06),
            inset 0 0 20px rgba(56,130,246,0.03),
            0 0 40px rgba(56,130,246,0.05),
            0 0 80px rgba(100,120,240,0.03)
          `,
        }}
      />
    </motion.div>
  );
}
