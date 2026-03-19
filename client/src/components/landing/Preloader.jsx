import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function Preloader({ onComplete }) {
  const [phase, setPhase] = useState('loading'); // loading → reveal → done

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 2200);
    const t2 = setTimeout(() => {
      setPhase('done');
      handleComplete();
    }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [handleComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: '#050810' }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Radial glow */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
            }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Center logo group */}
          <motion.div
            className="relative flex flex-col items-center"
            animate={
              phase === 'reveal'
                ? { scale: 30, opacity: 0, y: -100 }
                : { scale: 1, opacity: 1, y: 0 }
            }
            transition={
              phase === 'reveal'
                ? { duration: 0.8, ease: EASE_OUT }
                : { duration: 0.6 }
            }
          >
            {/* Outer pulse ring */}
            <motion.div
              className="absolute -inset-8 rounded-full"
              style={{ border: '1.5px solid rgba(59, 130, 246, 0.2)' }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
            />

            {/* Inner pulse ring */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{ border: '1px solid rgba(139, 92, 246, 0.15)' }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
              transition={{
                duration: 2.5,
                delay: 0.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />

            {/* Logo SVG */}
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 48 48" className="w-full h-full">
                <defs>
                  <linearGradient
                    id="preloader-grad"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Pin path drawn in */}
                <motion.path
                  d="M24 4C16 4 10 10.5 10 18c0 11 14 26 14 26s14-15 14-26c0-7.5-6-14-14-14z"
                  fill="none"
                  stroke="url(#preloader-grad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.6, ease: EASE_OUT }}
                />

                {/* Center circle appears */}
                <motion.circle
                  cx="24"
                  cy="18"
                  r="5"
                  fill="none"
                  stroke="url(#preloader-grad)"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: EASE_OUT }}
                />

                {/* Inner dot fills */}
                <motion.circle
                  cx="24"
                  cy="18"
                  r="2.5"
                  fill="url(#preloader-grad)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5, ease: EASE_OUT }}
                />

                {/* Orbit dots */}
                {[0, 72, 144, 216, 288].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const cx = 24 + Math.cos(rad) * 9;
                  const cy = 18 + Math.sin(rad) * 9;
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="1"
                      fill="#3b82f6"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: [0, 0.8, 0.4] }}
                      transition={{
                        delay: 1.4 + i * 0.1,
                        duration: 0.6,
                        ease: EASE_OUT,
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Brand text */}
            <motion.div
              className="mt-6 flex items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8, ease: EASE_OUT }}
            >
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-blue-500/40" />
              <span className="font-heading text-base tracking-[0.35em] text-white/50 uppercase">
                GeoConnect
              </span>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-violet-500/40" />
            </motion.div>
          </motion.div>

          {/* Loading progress bar */}
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-56 h-[1.5px] bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <motion.span
              className="text-[11px] font-mono tracking-widest text-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              LOADING EXPERIENCE
            </motion.span>
          </motion.div>

          {/* Corner coordinates */}
          <motion.span
            className="absolute top-8 left-8 text-[10px] font-mono text-white/10 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            48.8566° N, 2.3522° E
          </motion.span>
          <motion.span
            className="absolute top-8 right-8 text-[10px] font-mono text-white/10 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            35.6762° N, 139.6503° E
          </motion.span>
          <motion.span
            className="absolute bottom-8 left-8 text-[10px] font-mono text-white/10 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            -33.8688° S, 151.2093° E
          </motion.span>
          <motion.span
            className="absolute bottom-8 right-8 text-[10px] font-mono text-white/10 tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            40.7128° N, 74.0060° W
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
