import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

/* ─── Location Data ─────────────────────────────────────────────── */
const LOCATIONS = [
  {
    id: 1,
    name: 'Eiffel Tower',
    city: 'Paris, France',
    lat: 48.8584,
    lng: 2.2945,
    hint: 'The most romantic symbol of Europe',
    accent: '#e11d48',
  },
  {
    id: 2,
    name: 'Great Wall',
    city: 'Beijing, China',
    lat: 40.4319,
    lng: 116.5704,
    hint: 'A structure visible from space',
    accent: '#ea580c',
  },
  {
    id: 3,
    name: 'Statue of Liberty',
    city: 'New York, USA',
    lat: 40.6892,
    lng: -74.0445,
    hint: 'A gift from France to America',
    accent: '#059669',
  },
  {
    id: 4,
    name: 'Sydney Opera House',
    city: 'Sydney, Australia',
    lat: -33.8568,
    lng: 151.2153,
    hint: 'Iconic sail-shaped roof design',
    accent: '#2563eb',
  },
  {
    id: 5,
    name: 'Colosseum',
    city: 'Rome, Italy',
    lat: 41.8902,
    lng: 12.4922,
    hint: 'Where gladiators once fought',
    accent: '#d97706',
  },
  {
    id: 6,
    name: 'Machu Picchu',
    city: 'Cusco, Peru',
    lat: -13.1631,
    lng: -72.545,
    hint: 'The Inca city above the clouds',
    accent: '#16a34a',
  },
  {
    id: 7,
    name: 'Taj Mahal',
    city: 'Agra, India',
    lat: 27.1751,
    lng: 78.0421,
    hint: 'A marble tomb built for love',
    accent: '#7c3aed',
  },
  {
    id: 8,
    name: 'Leaning Tower of Pisa',
    city: 'Pisa, Italy',
    lat: 43.723,
    lng: 10.3966,
    hint: 'Famous for being... off balance',
    accent: '#db2777',
  },
];

const TOTAL_ROUNDS = 5;

/* ─── Haversine Distance (km) ───────────────────────────────────── */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Score Calculator ──────────────────────────────────────────── */
function calculateScore(distanceKm) {
  if (distanceKm < 50) return 1000;
  if (distanceKm < 150) return 800;
  if (distanceKm < 500) return 600;
  if (distanceKm < 1000) return 400;
  if (distanceKm < 2000) return 200;
  return 100;
}

/* ─── Confetti ──────────────────────────────────────────────────── */
function ConfettiParticle({ index }) {
  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const color = colors[index % colors.length];
  const x = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const dur = 1.5 + Math.random() * 1.5;
  const size = 5 + Math.random() * 7;
  const rot = Math.random() * 720 - 360;

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: `${x}%`,
        top: '-5%',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: '120vh',
        opacity: [1, 1, 0.8, 0],
        rotate: rot,
        x: [(Math.random() - 0.5) * 200],
      }}
      transition={{ duration: dur, delay, ease: 'easeOut' }}
    />
  );
}

/* ═══ MAIN COMPONENT ══════════════════════════════════════════════ */
export default function LocationGuesser() {
  const [gameState, setGameState] = useState('idle'); // idle | playing | roundResult | finished
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [guessPos, setGuessPos] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundDistance, setRoundDistance] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const guessMarkerRef = useRef(null);
  const actualMarkerRef = useRef(null);
  const lineRef = useRef(null);

  const startGame = useCallback(() => {
    const shuffled = [...LOCATIONS].sort(() => Math.random() - 0.5);
    setRounds(shuffled.slice(0, TOTAL_ROUNDS));
    setCurrentRound(0);
    setTotalScore(0);
    setGuessPos(null);
    setRoundScore(0);
    setRoundDistance(0);
    setGameState('playing');
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (gameState === 'idle' || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setGuessPos({ lat, lng });

      if (guessMarkerRef.current) guessMarkerRef.current.remove();

      const icon = L.divIcon({
        className: 'guess-marker-icon',
        html: '<div class="landing-guess-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      guessMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gameState]);

  // Submit a guess
  const submitGuess = useCallback(() => {
    if (!guessPos || !rounds[currentRound]) return;

    const target = rounds[currentRound];
    const dist = haversineDistance(guessPos.lat, guessPos.lng, target.lat, target.lng);
    const score = calculateScore(dist);

    setRoundDistance(Math.round(dist));
    setRoundScore(score);
    setTotalScore((prev) => prev + score);

    if (mapRef.current) {
      if (actualMarkerRef.current) actualMarkerRef.current.remove();
      if (lineRef.current) lineRef.current.remove();

      const actualIcon = L.divIcon({
        className: 'actual-marker-icon',
        html: `<div class="landing-actual-marker" style="--marker-color: ${target.accent}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      actualMarkerRef.current = L.marker([target.lat, target.lng], { icon: actualIcon }).addTo(
        mapRef.current
      );

      lineRef.current = L.polyline(
        [
          [guessPos.lat, guessPos.lng],
          [target.lat, target.lng],
        ],
        { color: '#6366f1', weight: 2, dashArray: '6, 8', opacity: 0.6 }
      ).addTo(mapRef.current);

      const bounds = L.latLngBounds(
        [guessPos.lat, guessPos.lng],
        [target.lat, target.lng]
      );
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
    }

    if (score >= 800) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setGameState('roundResult');
  }, [guessPos, rounds, currentRound]);

  // Next round or finish
  const nextRound = useCallback(() => {
    if (guessMarkerRef.current) {
      guessMarkerRef.current.remove();
      guessMarkerRef.current = null;
    }
    if (actualMarkerRef.current) {
      actualMarkerRef.current.remove();
      actualMarkerRef.current = null;
    }
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }

    setGuessPos(null);

    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setGameState('finished');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else {
      setCurrentRound((prev) => prev + 1);
      setGameState('playing');
      if (mapRef.current) {
        mapRef.current.setView([20, 0], 2, { animate: true });
      }
    }
  }, [currentRound]);

  // Get rank
  const getRank = () => {
    const pct = (totalScore / (TOTAL_ROUNDS * 1000)) * 100;
    if (pct >= 90) return { title: 'Master Explorer', color: 'text-amber-400' };
    if (pct >= 70) return { title: 'Expert Geographer', color: 'text-emerald-400' };
    if (pct >= 50) return { title: 'Brave Traveler', color: 'text-sky-400' };
    return { title: 'New Explorer', color: 'text-violet-400' };
  };

  const loc = rounds[currentRound];

  return (
    <div className="relative w-full">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Idle State ───────────────────────────── */}
      {gameState === 'idle' && (
        <motion.div
          className="flex flex-col items-center justify-center py-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Abstract globe */}
          <div className="relative mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20" />
            <motion.div
              className="absolute inset-0 rounded-full border border-blue-500/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border border-violet-500/15"
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border border-cyan-500/10 border-dashed"
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-blue-400 to-violet-400 opacity-40 blur-sm" />
          </div>

          <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">
            Test Your Geography
          </h3>
          <p className="mt-3 max-w-sm text-gray-400">
            Can you guess the location of {TOTAL_ROUNDS} famous landmarks around the world?
            Click on the map to place your guess.
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

      {/* ── Playing / Round Result ──────────────────── */}
      {(gameState === 'playing' || gameState === 'roundResult') && loc && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Score bar */}
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3">
            <div className="flex items-center gap-2.5">
              {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i < currentRound
                      ? 'bg-emerald-400'
                      : i === currentRound
                        ? 'scale-125 bg-blue-400 ring-[3px] ring-blue-500/20'
                        : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-sm font-semibold text-white">{totalScore} pts</span>
          </div>

          {/* Location hint card */}
          <motion.div
            key={loc.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: loc.accent }}
            >
              {String(currentRound + 1).padStart(2, '0')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h4 className="font-heading truncate text-lg font-bold text-white">{loc.name}</h4>
                <span className="shrink-0 text-xs text-gray-500">
                  {currentRound + 1}/{TOTAL_ROUNDS}
                </span>
              </div>
              <p className="text-sm text-gray-400">{loc.hint}</p>
            </div>
          </motion.div>

          {/* Map container */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08]">
            <div
              ref={mapContainerRef}
              className="h-[200px] w-full sm:h-[280px] lg:h-[320px]"
              style={{ zIndex: 1 }}
            />

            {/* Submit button overlay */}
            {gameState === 'playing' && (
              <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
                <motion.button
                  onClick={submitGuess}
                  disabled={!guessPos}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition-all ${
                    guessPos
                      ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-blue-500/20 hover:shadow-blue-500/30'
                      : 'cursor-not-allowed bg-white/5 text-gray-600'
                  }`}
                  whileHover={guessPos ? { scale: 1.03 } : {}}
                  whileTap={guessPos ? { scale: 0.97 } : {}}
                >
                  {guessPos ? 'Confirm Location' : 'Click the map to guess'}
                </motion.button>
              </div>
            )}
          </div>

          {/* Round result */}
          <AnimatePresence>
            {gameState === 'roundResult' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mt-4 flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <motion.span
                    className="font-heading text-2xl font-bold text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    +{roundScore} pts
                  </motion.span>
                  <p className="mt-1 text-sm text-gray-400">
                    Distance: {roundDistance.toLocaleString()} km &mdash; {loc.name}, {loc.city}
                  </p>
                </div>
                <motion.button
                  onClick={nextRound}
                  className="shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {currentRound + 1 >= TOTAL_ROUNDS ? 'View Results' : 'Next Round'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Finished State ───────────────────────────── */}
      {gameState === 'finished' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="py-4 text-center"
        >
          <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">Complete!</h3>
          <motion.div
            className="mt-2 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text font-heading text-5xl font-black text-transparent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.15, damping: 10 }}
          >
            {totalScore}/{TOTAL_ROUNDS * 1000}
          </motion.div>
          <p className={`mt-2 text-lg font-semibold ${getRank().color}`}>{getRank().title}</p>

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
