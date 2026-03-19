import { motion } from 'framer-motion';

/**
 * LoadingSpinner — polished dual-ring animated spinner.
 *
 * Uses two concentric rings rotating in opposite directions
 * with accent-primary and accent-secondary colors.
 */

const sizes = {
  sm: { outer: 20, inner: 14, stroke: 2 },
  md: { outer: 32, inner: 22, stroke: 2.5 },
  lg: { outer: 48, inner: 34, stroke: 3 },
};

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const { outer, inner, stroke } = sizes[size] || sizes.md;
  const outerR = (outer - stroke) / 2;
  const innerR = (inner - stroke) / 2;

  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      <div className="relative" style={{ width: outer, height: outer }}>
        {/* Outer ring — accent-primary, clockwise */}
        <motion.svg
          width={outer}
          height={outer}
          viewBox={`0 0 ${outer} ${outer}`}
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={outerR}
            fill="none"
            stroke="var(--accent-primary, #3b82f6)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${outerR * Math.PI * 0.75} ${outerR * Math.PI * 1.25}`}
            opacity="0.9"
          />
        </motion.svg>

        {/* Inner ring — accent-secondary, counter-clockwise */}
        <motion.svg
          width={inner}
          height={inner}
          viewBox={`0 0 ${inner} ${inner}`}
          className="absolute"
          style={{ top: (outer - inner) / 2, left: (outer - inner) / 2 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx={inner / 2}
            cy={inner / 2}
            r={innerR}
            fill="none"
            stroke="var(--accent-secondary, #06b6d4)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${innerR * Math.PI * 0.5} ${innerR * Math.PI * 1.5}`}
            opacity="0.7"
          />
        </motion.svg>

        {/* Center dot */}
        <motion.div
          className="absolute rounded-full bg-accent-primary"
          style={{
            width: stroke + 1,
            height: stroke + 1,
            top: (outer - stroke - 1) / 2,
            left: (outer - stroke - 1) / 2,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
