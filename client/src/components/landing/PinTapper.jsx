import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Config ──────────────────────────────────────────────────── */
const GAME_DURATION = 30;
const PIN_LIFETIME = 2000;
const SPAWN_MIN = 650;
const SPAWN_MAX = 1250;
const PIN_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

/* ═══ MAIN COMPONENT ══════════════════════════════════════════════ */
export default function PinTapper() {
  const [gameState, setGameState] = useState('idle'); // idle | playing | finished
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [pins, setPins] = useState([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalSpawned, setTotalSpawned] = useState(0);
  const [floats, setFloats] = useState([]);

  const nextId = useRef(0);
  const spawnRef = useRef(null);
  const boardRef = useRef(null);
  const stateRef = useRef('idle');

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  /* ── Start / Reset ────────────────────────── */
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPins([]);
    setCombo(0);
    setBestCombo(0);
    setTotalHits(0);
    setTotalSpawned(0);
    setFloats([]);
    nextId.current = 0;
  }, []);

  /* ── Countdown ────────────────────────────── */
  useEffect(() => {
    if (gameState !== 'playing') return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState('finished');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [gameState]);

  /* ── Pin Spawner ──────────────────────────── */
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawn = () => {
      if (stateRef.current !== 'playing') return;

      const id = nextId.current++;
      const color = PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)];
      const x = 8 + Math.random() * 84;
      const y = 8 + Math.random() * 84;
      const size = 26 + Math.random() * 20;
      const points = size < 36 ? 15 : 10; // Smaller = harder = more points

      setPins((p) => [...p, { id, x, y, size, color, points }]);
      setTotalSpawned((n) => n + 1);

      // Auto-expire after lifetime (miss)
      setTimeout(() => {
        let missed = false;
        setPins((p) => {
          missed = p.some((pin) => pin.id === id);
          return p.filter((pin) => pin.id !== id);
        });
        if (missed) setCombo(0);
      }, PIN_LIFETIME);

      const delay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      spawnRef.current = setTimeout(spawn, delay);
    };

    spawn();
    return () => clearTimeout(spawnRef.current);
  }, [gameState]);

  /* ── Hit a Pin ────────────────────────────── */
  const hitPin = useCallback((pin, e) => {
    e.stopPropagation();
    setPins((p) => p.filter((pp) => pp.id !== pin.id));

    setCombo((c) => {
      const next = c + 1;
      setBestCombo((b) => Math.max(b, next));
      const bonus = Math.min(c * 5, 50);
      const earned = pin.points + bonus;
      setScore((s) => s + earned);

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setFloats((f) => [
          ...f,
          {
            id: Date.now() + Math.random(),
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            value: earned,
          },
        ]);
      }
      return next;
    });

    setTotalHits((n) => n + 1);
  }, []);

  /* ── Rank ──────────────────────────────────── */
  const getRank = () => {
    if (score >= 500) return { title: 'Pin Master', color: 'text-amber-400' };
    if (score >= 300) return { title: 'Sharp Spotter', color: 'text-emerald-400' };
    if (score >= 150) return { title: 'Quick Tapper', color: 'text-sky-400' };
    return { title: 'Rookie Spotter', color: 'text-violet-400' };
  };

  const accuracy = totalSpawned > 0 ? Math.round((totalHits / totalSpawned) * 100) : 0;

  /* ═══ RENDER ════════════════════════════════════════════════════ */
  return (
    <div className="relative w-full">
      {/* ── Idle State ───────────────────────────── */}
      {gameState === 'idle' && (
        <motion.div
          className="flex flex-col items-center justify-center py-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Animated target */}
          <div className="relative mb-6 h-16 w-16">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-3 rounded-full border border-violet-500/40"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-blue-400 to-violet-400 opacity-60 blur-sm" />
            <div className="absolute inset-[35%] rounded-full bg-gradient-to-br from-blue-400 to-violet-400" />
          </div>

          <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">Pin Tapper</h3>
          <p className="mt-3 max-w-sm text-gray-400">
            Pins pop up randomly on the board. Click them as fast as you can before they
            vanish! Build combos for bonus points. You have 30 seconds.
          </p>
          <motion.button
            onClick={startGame}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Start Game
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </motion.div>
      )}

      {/* ── Playing State ────────────────────────── */}
      {gameState === 'playing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* HUD */}
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="font-mono text-xs text-gray-500">TIME</span>
                <span
                  className={`ml-2 font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}
                >
                  {timeLeft}s
                </span>
              </div>
              <AnimatePresence>
                {combo > 1 && (
                  <motion.span
                    key={combo}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-400"
                  >
                    x{combo} COMBO
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="font-mono text-lg font-bold text-white">{score} pts</span>
          </div>

          {/* Game board */}
          <div
            ref={boardRef}
            className="relative overflow-hidden rounded-xl border border-white/[0.08]"
            style={{ height: 'clamp(200px, 40vh, 380px)' }}
          >
            {/* Dark map-like background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c1428] via-[#0a1020] to-[#0f1530]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Timer bar */}
            <div className="absolute left-0 right-0 top-0 z-10 h-1 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: GAME_DURATION, ease: 'linear' }}
              />
            </div>

            {/* Pins */}
            <AnimatePresence>
              {pins.map((pin) => (
                <motion.button
                  key={pin.id}
                  className="absolute z-20 cursor-pointer"
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onClick={(e) => hitPin(pin, e)}
                >
                  <div
                    className="rounded-full transition-transform hover:scale-125"
                    style={{
                      width: pin.size,
                      height: pin.size,
                      backgroundColor: pin.color,
                      boxShadow: `0 0 ${pin.size}px ${pin.color}40, 0 0 ${pin.size * 2}px ${pin.color}15`,
                    }}
                  />
                  {/* Lifetime ring (shrinks as pin expires) */}
                  <motion.div
                    className="pointer-events-none absolute rounded-full border"
                    style={{
                      width: pin.size + 16,
                      height: pin.size + 16,
                      left: '50%',
                      top: '50%',
                      x: '-50%',
                      y: '-50%',
                      borderColor: pin.color + '30',
                    }}
                    initial={{ scale: 1.5, opacity: 0.6 }}
                    animate={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: PIN_LIFETIME / 1000, ease: 'linear' }}
                  />
                </motion.button>
              ))}
            </AnimatePresence>

            {/* Floating score numbers */}
            {floats.map((f) => (
              <motion.div
                key={f.id}
                className="pointer-events-none absolute z-30 font-heading text-lg font-bold text-white"
                style={{ left: f.x, top: f.y }}
                initial={{ opacity: 1, y: 0, scale: 1.3 }}
                animate={{ opacity: 0, y: -50, scale: 0.8 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                +{f.value}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Finished State ───────────────────────── */}
      {gameState === 'finished' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="py-4 text-center"
        >
          <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">
            Time&apos;s Up!
          </h3>
          <motion.div
            className="mt-2 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text font-heading text-5xl font-extrabold text-transparent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.15, damping: 10 }}
          >
            {score} pts
          </motion.div>
          <p className={`mt-2 text-lg font-semibold ${getRank().color}`}>{getRank().title}</p>

          {/* Stats */}
          <div className="mt-6 flex justify-center gap-8">
            {[
              { val: totalHits, label: 'Hits' },
              { val: `${accuracy}%`, label: 'Accuracy' },
              { val: `x${bestCombo}`, label: 'Best Combo' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-mono text-2xl font-bold text-white">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <motion.button
              onClick={startGame}
              className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Play Again
            </motion.button>
            <motion.a
              href="/register"
              className="rounded-full border border-white/10 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Join GeoConnect
            </motion.a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
