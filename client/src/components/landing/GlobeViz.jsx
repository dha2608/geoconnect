import { useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

// City markers with geographic-style positions on the globe
const CITIES = [
  { name: 'Paris', x: 52, y: 28, color: '#3b82f6', size: 'lg' },
  { name: 'Tokyo', x: 82, y: 36, color: '#8b5cf6', size: 'lg' },
  { name: 'New York', x: 28, y: 34, color: '#06b6d4', size: 'lg' },
  { name: 'Sydney', x: 84, y: 68, color: '#10b981', size: 'md' },
  { name: 'São Paulo', x: 34, y: 62, color: '#f59e0b', size: 'md' },
  { name: 'Dubai', x: 62, y: 38, color: '#ef4444', size: 'sm' },
  { name: 'Seoul', x: 78, y: 32, color: '#8b5cf6', size: 'sm' },
  { name: 'London', x: 48, y: 26, color: '#3b82f6', size: 'sm' },
  { name: 'Lagos', x: 50, y: 50, color: '#10b981', size: 'sm' },
  { name: 'Mumbai', x: 68, y: 42, color: '#f59e0b', size: 'sm' },
];

// Connection arcs between cities
const CONNECTIONS = [
  { from: 0, to: 2, color: '#3b82f6' }, // Paris → NYC
  { from: 1, to: 3, color: '#8b5cf6' }, // Tokyo → Sydney
  { from: 2, to: 4, color: '#06b6d4' }, // NYC → São Paulo
  { from: 0, to: 5, color: '#ef4444' }, // Paris → Dubai
  { from: 1, to: 6, color: '#8b5cf6' }, // Tokyo → Seoul
  { from: 5, to: 9, color: '#f59e0b' }, // Dubai → Mumbai
  { from: 7, to: 8, color: '#10b981' }, // London → Lagos
  { from: 2, to: 7, color: '#3b82f6' }, // NYC → London
];

// Generate fibonacci sphere dots for background texture
function generateSphereDots(count, radius) {
  const dots = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / count);
    const phi = (2 * Math.PI * i) / goldenRatio;
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.cos(theta);
    const z = Math.sin(theta) * Math.sin(phi);
    // Only show front-facing dots (z > threshold)
    if (z > -0.15) {
      const depth = (z + 1) / 2;
      dots.push({
        cx: 50 + x * radius,
        cy: 50 + y * radius,
        depth,
        id: i,
      });
    }
  }
  return dots;
}

// Generate a curved SVG path between two points
function arcPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset for arc curvature
  const offset = dist * 0.3;
  const cx = mx - (dy / dist) * offset;
  const cy = my + (dx / dist) * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export default function GlobeViz({ mouseX, mouseY, size = 420 }) {
  const sphereDots = useMemo(() => generateSphereDots(120, 42), []);

  // Mouse-driven subtle tilt
  const rotateX = useSpring(useTransform(mouseY, (v) => v * 0.08), {
    stiffness: 40,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, (v) => v * -0.08), {
    stiffness: 40,
    damping: 25,
  });

  return (
    <motion.div
      className="relative"
      style={{
        width: size,
        height: size,
        perspective: '1000px',
        rotateX,
        rotateY,
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-16 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.03) 40%, transparent 65%)',
        }}
      />

      {/* Globe container */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {/* Globe body — gradient sphere */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 38% 35%, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.06) 30%, rgba(6,182,212,0.02) 60%, transparent 80%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow:
              'inset 0 0 80px rgba(59,130,246,0.05), inset -20px -20px 60px rgba(0,0,0,0.3)',
          }}
        />

        {/* SVG layer */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full landing-globe-spin"
        >
          <defs>
            {/* Gradient for arcs */}
            {CONNECTIONS.map((conn, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`arc-grad-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={conn.color} stopOpacity="0.6" />
                <stop offset="50%" stopColor={conn.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={conn.color} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>

          {/* Latitude rings */}
          {[20, 35, 50, 65, 80].map((cy, i) => (
            <ellipse
              key={`lat-${i}`}
              cx="50"
              cy={cy}
              rx={42 * Math.sin(((cy / 100) * Math.PI))}
              ry={3 + Math.abs(cy - 50) * 0.04}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.3"
              strokeDasharray="2 3"
            />
          ))}

          {/* Longitude arcs */}
          {[0, 30, 60, 90, 120, 150].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const rx = 42 * Math.abs(Math.sin(rad));
            return (
              <ellipse
                key={`lon-${i}`}
                cx="50"
                cy="50"
                rx={Math.max(rx, 0.5)}
                ry="42"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.3"
                strokeDasharray="1.5 4"
              />
            );
          })}

          {/* Sphere dots (background texture) */}
          {sphereDots.map((dot) => (
            <circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r={0.3 + dot.depth * 0.6}
              fill={
                dot.depth > 0.6
                  ? `rgba(59,130,246,${0.1 + dot.depth * 0.25})`
                  : `rgba(139,92,246,${0.05 + dot.depth * 0.12})`
              }
            />
          ))}

          {/* Connection arcs */}
          {CONNECTIONS.map((conn, i) => {
            const from = CITIES[conn.from];
            const to = CITIES[conn.to];
            const pathD = arcPath(from.x, from.y, to.x, to.y);
            return (
              <g key={`conn-${i}`}>
                {/* Glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.06"
                  strokeLinecap="round"
                />
                {/* Main arc */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={`url(#arc-grad-${i})`}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeDasharray="3 6"
                  className="landing-arc-dash"
                />
                {/* Traveling dot */}
                <circle r="1" fill={conn.color} opacity="0.8">
                  <animateMotion
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      {/* City markers (positioned outside SVG for better interactivity) */}
      {CITIES.map((city, i) => {
        const dotSize =
          city.size === 'lg' ? 10 : city.size === 'md' ? 7 : 5;
        const showLabel = city.size === 'lg' || city.size === 'md';

        return (
          <motion.div
            key={i}
            className="absolute group cursor-pointer"
            style={{
              left: `${city.x}%`,
              top: `${city.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 3 + i * 0.3,
              delay: i * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{ scale: 1.5, zIndex: 10 }}
          >
            {/* Ping ring */}
            <div
              className="absolute rounded-full animate-ping"
              style={{
                width: dotSize + 12,
                height: dotSize + 12,
                left: -(dotSize + 12 - dotSize) / 2,
                top: -(dotSize + 12 - dotSize) / 2,
                background: city.color,
                opacity: 0.15,
              }}
            />

            {/* Outer glow ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: dotSize + 8,
                height: dotSize + 8,
                left: -(8) / 2,
                top: -(8) / 2,
                border: `1px solid ${city.color}30`,
                boxShadow: `0 0 ${dotSize}px ${city.color}20`,
              }}
            />

            {/* Core dot */}
            <div
              className="rounded-full relative"
              style={{
                width: dotSize,
                height: dotSize,
                background: city.color,
                boxShadow: `0 0 ${dotSize * 2}px ${city.color}50`,
              }}
            />

            {/* Label */}
            {showLabel && (
              <div
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ zIndex: 20 }}
              >
                <div
                  className="px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider backdrop-blur-sm"
                  style={{
                    background: 'rgba(5,8,16,0.85)',
                    border: `1px solid ${city.color}30`,
                    color: `${city.color}dd`,
                  }}
                >
                  {city.name.toUpperCase()}
                  <span className="block text-[8px] text-white/30 mt-0.5">
                    {Math.floor(Math.random() * 500 + 100)} users online
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Equator accent ring */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
        style={{
          width: '92%',
          height: '92%',
          transform: 'translate(-50%, -50%) rotateX(75deg)',
          border: '0.5px solid rgba(59,130,246,0.08)',
        }}
      />

      {/* Meridian accent ring */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full pointer-events-none landing-globe-ring-pulse"
        style={{
          width: '88%',
          height: '88%',
          transform: 'translate(-50%, -50%) rotateY(25deg) rotateX(10deg)',
          border: '0.5px dashed rgba(139,92,246,0.06)',
        }}
      />
    </motion.div>
  );
}
