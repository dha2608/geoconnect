import { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  AnimatePresence,
} from 'framer-motion';

const LocationGuesser = lazy(() => import('../components/landing/LocationGuesser'));
const PinTapper = lazy(() => import('../components/landing/PinTapper'));
const Preloader = lazy(() => import('../components/landing/Preloader'));
import GlobeViz from '../components/landing/GlobeViz';
import AppShowcase from '../components/landing/AppShowcase';
import FAQ from '../components/landing/FAQ';

/* ═══════════════════════════════════════════════════════════════════
   SECTION NAVIGATION DATA
   ═══════════════════════════════════════════════════════════════════ */

const SECTION_NAV = [
  { id: 'hero', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-works', label: 'How it Works' },
  { id: 'preview', label: 'Product' },
  { id: 'games', label: 'Pin Tapper' },
  { id: 'geo-game', label: 'Geography' },
  { id: 'testimonials', label: 'Reviews' },
  { id: 'faq', label: 'FAQ' },
  { id: 'community', label: 'Community' },
  { id: 'cta', label: 'Join Us' },
];

const SECTION_IDS = SECTION_NAV.map((s) => s.id);

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */

/** Set body background for landing page */
function useBodyScroll() {
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = '#050810';
    return () => {
      document.body.style.background = prevBg;
    };
  }, []);
}

/** Animated counter — re-triggers every time it enters viewport */
function useCounter(end, duration = 2200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-80px' });
  const animRef = useRef(null);

  useEffect(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    if (inView) {
      setCount(0);
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - (1 - p) ** 3;
        setCount(Math.round(eased * end));
        if (p < 1) animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } else {
      setCount(0);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [end, duration, inView]);

  return { count, ref };
}

/** Mouse parallax — spring-dampened motion values */
function useMouseParallax() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    const handler = (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseX, mouseY]);

  return { mouseX: springX, mouseY: springY };
}

/** Typewriter with blinking cursor */
function useTypewriter(text, speed = 45, startDelay = 600) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timeout;
    let i = 0;
    timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplay(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      timeout = interval;
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { display, done };
}

/** Track which section is currently in view */
function useActiveSection(containerRef) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            const idx = SECTION_IDS.indexOf(entry.target.id);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { root: container, threshold: [0.35, 0.5] }
    );

    SECTION_IDS.forEach((id) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [containerRef]);

  return active;
}

/* ═══════════════════════════════════════════════════════════════════
   ANIMATION PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

/** Scroll progress bar */
function ScrollProgress({ containerRef }) {
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500"
      style={{ scaleX }}
    />
  );
}

/** Cursor glow spotlight */
function CursorGlow() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const handler = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [x, y]);

  const bg = useMotionTemplate`radial-gradient(600px circle at ${x}px ${y}px, rgba(59,130,246,0.04), transparent 40%)`;
  return <motion.div className="pointer-events-none fixed inset-0 z-30" style={{ background: bg }} />;
}

/** Scroll-triggered reveal — replays every time section enters view, smoother springs */
function Reveal({ children, delay = 0, className = '', variant = 'fade-up' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-6%' });

  const VARIANTS = {
    'fade-up': { hidden: { opacity: 0, y: 70 }, visible: { opacity: 1, y: 0 } },
    'fade-down': { hidden: { opacity: 0, y: -50 }, visible: { opacity: 1, y: 0 } },
    'fade-left': { hidden: { opacity: 0, x: 80 }, visible: { opacity: 1, x: 0 } },
    'fade-right': { hidden: { opacity: 0, x: -80 }, visible: { opacity: 1, x: 0 } },
    'blur-in': {
      hidden: { opacity: 0, filter: 'blur(24px)', y: 30, scale: 0.96 },
      visible: { opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 },
    },
    'scale-up': {
      hidden: { opacity: 0, scale: 0.75 },
      visible: { opacity: 1, scale: 1 },
    },
    'slide-rotate': {
      hidden: { opacity: 0, y: 80, rotate: 3 },
      visible: { opacity: 1, y: 0, rotate: 0 },
    },
  };

  const v = VARIANTS[variant] || VARIANTS['fade-up'];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={v.hidden}
      animate={inView ? v.visible : v.hidden}
      transition={{
        delay: inView ? delay : 0,
        duration: 1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — replays on re-enter */
function StaggerContainer({ children, className = '', stagger = 0.08 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-6%' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = '', variant = 'up' }) {
  const variants = {
    up: {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
    },
    blur: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    },
  };

  return (
    <motion.div className={className} variants={variants[variant] || variants.up}>
      {children}
    </motion.div>
  );
}

/** 3D tilt card */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRX = useSpring(rotateX, { stiffness: 250, damping: 25 });
  const springRY = useSpring(rotateY, { stiffness: 250, damping: 25 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(y * -12);
    rotateY.set(x * 12);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { rotateX.set(0); rotateY.set(0); }}
      className={className}
      style={{ perspective: 800, rotateX: springRX, rotateY: springRY, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

/** Split text — animates each word individually */
function SplitText({ text, className = '', delay = 0, stagger = 0.04 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-12%' });
  const words = text.split(' ');

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 45, filter: 'blur(10px)' }}
          animate={inView
            ? { opacity: 1, y: 0, filter: 'blur(0px)' }
            : { opacity: 0, y: 45, filter: 'blur(10px)' }
          }
          transition={{
            delay: inView ? delay + i * stagger : 0,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}{i < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
}

/** Magnetic button — follows cursor with spring physics */
function MagneticButton({ children, className = '', strength = 0.3 }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * strength);
        y.set((e.clientY - rect.top - rect.height / 2) * strength);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NAVIGATION — Side Dots + Section Counter
   ═══════════════════════════════════════════════════════════════════ */

function SideNav({ activeSection, scrollTo }) {
  return (
    <nav className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 lg:block" aria-label="Section navigation">
      {/* Connecting line track */}
      <div className="absolute right-[5px] top-0 h-full w-px">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        {/* Active progress fill */}
        <motion.div
          className="absolute left-0 top-0 w-full bg-gradient-to-b from-blue-500/60 to-violet-500/60"
          animate={{ height: `${(activeSection / Math.max(SECTION_NAV.length - 1, 1)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 22 }}
        />
      </div>

      <div className="flex flex-col items-end gap-5">
        {SECTION_NAV.map((section, i) => (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className="group relative flex items-center"
            aria-label={`Go to ${section.label}`}
            aria-current={i === activeSection ? 'true' : undefined}
          >
            {/* Tooltip label */}
            <span className={`mr-4 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-300
              ${i === activeSection
                ? 'text-white opacity-100 translate-x-0'
                : 'text-gray-500 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
              }`}
            >
              {section.label}
            </span>

            {/* Dot */}
            <div className="relative">
              <motion.div
                className="relative z-10 rounded-full"
                animate={{
                  width: i === activeSection ? 12 : 5,
                  height: i === activeSection ? 12 : 5,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    backgroundColor: i === activeSection ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                    boxShadow: i === activeSection ? '0 0 12px rgba(59,130,246,0.5)' : '0 0 0px transparent',
                  }}
                  transition={{ duration: 0.4 }}
                  style={{ width: '100%', height: '100%' }}
                />
              </motion.div>
              {/* Pulse ring on active */}
              {i === activeSection && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/40"
                  animate={{ width: [12, 28], height: [12, 28], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionCounter({ active, total }) {
  return (
    <div className="fixed bottom-8 left-8 z-50 hidden items-center gap-2 lg:flex">
      <AnimatePresence mode="wait">
        <motion.span
          key={active}
          className="font-mono text-2xl font-bold text-white"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {String(active + 1).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
      <span className="font-mono text-xs text-gray-600">/</span>
      <span className="font-mono text-xs text-gray-600">{String(total).padStart(2, '0')}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HERO — Particle Field
   ═══════════════════════════════════════════════════════════════════ */

function ParticleField({ mouseX, mouseY }) {
  const offsetX = useTransform(mouseX, [-1, 1], [-15, 15]);
  const offsetY = useTransform(mouseY, [-1, 1], [-15, 15]);

  const particles = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.08 + Math.random() * 0.22,
        tx1: (Math.random() - 0.5) * 40,
        ty1: (Math.random() - 0.5) * 40,
        tx2: (Math.random() - 0.5) * 60,
        ty2: (Math.random() - 0.5) * 60,
        tx3: (Math.random() - 0.5) * 30,
        ty3: (Math.random() - 0.5) * 30,
        dur: 18 + Math.random() * 24,
        del: Math.random() * 12,
      })),
    []
  );

  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ x: offsetX, y: offsetY }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="landing-particle text-blue-400"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity,
            '--tx1': `${p.tx1}px`, '--ty1': `${p.ty1}px`,
            '--tx2': `${p.tx2}px`, '--ty2': `${p.ty2}px`,
            '--tx3': `${p.tx3}px`, '--ty3': `${p.ty3}px`,
            '--dur': `${p.dur}s`, '--del': `${p.del}s`,
          }}
        />
      ))}
    </motion.div>
  );
}

/* NetworkViz replaced by imported GlobeViz component */

/* ═══════════════════════════════════════════════════════════════════
   DATA — All English
   ═══════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    title: 'Interactive Map',
    subtitle: 'EXPLORE',
    desc: 'Discover the world through a real-time map with thousands of pins. Bookmark locations, create routes, and share moments at any coordinate.',
    detail: 'Switch between satellite, terrain, and night mode. See friends and events in real-time. Build custom routes and export them. Full offline support for saved areas.',
    color: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    large: true,
  },
  {
    title: 'Live Connection',
    subtitle: 'CONNECT',
    desc: 'Find friends nearby, follow live locations, and interact directly on the map in real-time.',
    detail: 'Share your location with trusted friends. See who\'s nearby. Send quick reactions and messages without leaving the map view.',
    color: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    large: false,
  },
  {
    title: 'Share Moments',
    subtitle: 'CREATE',
    desc: 'Post photos, reviews, and stories tied to real coordinates. Build your personal memory map.',
    detail: 'Attach photos, write reviews, rate places. Your pins become a visual journal of everywhere you\'ve been. Share collections with friends.',
    color: '#06b6d4',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM18.75 10.5h.008v.008h-.008V10.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    large: false,
  },
  {
    title: 'Discover Events',
    subtitle: 'DISCOVER',
    desc: 'Never miss events around you. From food festivals to concerts — everything shows up on the map.',
    detail: 'Browse events by category, distance, or popularity. Get notified when something exciting happens nearby. Create and promote your own events.',
    color: '#10b981',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    large: true,
  },
];

const STATS = [
  { value: 12500, suffix: '+', label: 'Active users' },
  { value: 48000, suffix: '+', label: 'Locations pinned' },
  { value: 156, suffix: '', label: 'Countries connected' },
  { value: 98, suffix: '%', label: 'Satisfaction rating' },
];

const TESTIMONIALS = [
  {
    quote: 'GeoConnect changed how I explore cities. Every street corner has a new story waiting to be discovered.',
    name: 'Sarah Chen',
    role: 'Travel Blogger',
    gradient: 'from-blue-400 to-cyan-400',
  },
  {
    quote: 'The real-time location sharing makes it so easy for our friend group to find each other. Incredibly convenient!',
    name: 'Alex Rivera',
    role: 'Software Engineer',
    gradient: 'from-violet-400 to-pink-400',
  },
  {
    quote: 'The geography guessing minigame is so addictive! My whole team plays during lunch break every day.',
    name: 'Emma Wilson',
    role: 'Product Designer',
    gradient: 'from-emerald-400 to-teal-400',
  },
  {
    quote: 'Beautiful dark mode, buttery smooth maps, and the event pinning feature is perfect for event organizers.',
    name: 'James Park',
    role: 'Event Organizer',
    gradient: 'from-orange-400 to-red-400',
  },
];

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Sign up free in 30 seconds with email, or log in via Google or GitHub.', color: '#3b82f6' },
  { num: '02', title: 'Pin your locations', desc: 'Share your favorite spots, post photos, write reviews, and mark your journey on the map.', color: '#8b5cf6' },
  { num: '03', title: 'Explore & connect', desc: 'Find friends, join events, and discover the world with the GeoConnect community.', color: '#10b981' },
];

/* AppMockup replaced by imported AppShowcase component */

/* ═══════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({ stat }) {
  const { count, ref } = useCounter(stat.value, 2500);
  return (
    <StaggerItem variant="scale">
      <motion.div ref={ref}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center backdrop-blur-sm transition-all hover:border-white/[0.12] sm:p-8"
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-violet-500/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative">
          <div className="font-heading text-3xl font-extrabold sm:text-4xl">
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              {count.toLocaleString()}
            </span>
            <span className="text-blue-400">{stat.suffix}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
        </div>
      </motion.div>
    </StaggerItem>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TESTIMONIAL CAROUSEL
   ═══════════════════════════════════════════════════════════════════ */

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const count = TESTIMONIALS.length;

  useEffect(() => {
    const timer = setInterval(() => setActive((prev) => (prev + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [count]);

  const t = TESTIMONIALS[active];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative flex min-h-[220px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -30, filter: 'blur(12px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <svg key={j} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-6 text-xl font-medium leading-relaxed text-gray-200 sm:text-2xl">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.gradient} ring-2 ring-white/10`} />
              <div className="text-left">
                <p className="font-heading text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-gradient-to-r from-blue-500 to-violet-500' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GAME LOADING SPINNER
   ═══════════════════════════════════════════════════════════════════ */

function GameSpinner() {
  return (
    <div className="flex h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ░░ LANDING PAGE — Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  useBodyScroll();
  const containerRef = useRef(null);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [showPreloader, setShowPreloader] = useState(true);
  const activeSection = useActiveSection(containerRef);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const navBg = useTransform(scrollYProgress, [0, 0.02], [0, 1]);
  const heroParallax = useTransform(scrollYProgress, [0, 0.15], [0, -80]);
  const { mouseX, mouseY } = useMouseParallax();

  const badgeText = "Vietnam's first map-based social network";
  const { display: typedBadge, done: badgeDone } = useTypewriter(badgeText, 35, 800);

  const orbOffsetX = useTransform(mouseX, [-1, 1], [30, -30]);
  const orbOffsetY = useTransform(mouseY, [-1, 1], [30, -30]);

  const toggleFeature = useCallback((i) => {
    setExpandedFeature((prev) => (prev === i ? null : i));
  }, []);

  const scrollTo = useCallback((id) => {
    containerRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Keyboard navigation — arrow keys move between sections
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(activeSection + 1, SECTION_NAV.length - 1);
        scrollTo(SECTION_NAV[next].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(activeSection - 1, 0);
        scrollTo(SECTION_NAV[prev].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSection, scrollTo]);

  return (
    <>
      {showPreloader && (
        <Suspense fallback={null}>
          <Preloader onComplete={() => setShowPreloader(false)} />
        </Suspense>
      )}
    <div
      ref={containerRef}
      className="landing-scroll-container relative h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth bg-[#050810] font-body text-gray-100"
      tabIndex={-1}
    >
      <ScrollProgress containerRef={containerRef} />
      <CursorGlow />
      <SideNav activeSection={activeSection} scrollTo={scrollTo} />
      <SectionCounter active={activeSection} total={SECTION_NAV.length} />

      {/* ═══ MINIMAL TOP BAR ═════════════════════════════════════ */}
      <motion.nav className="fixed inset-x-0 top-0 z-50">
        <motion.div className="absolute inset-0 border-b border-white/[0.06] bg-[#050810]/80 backdrop-blur-2xl" style={{ opacity: navBg }} />
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/welcome" className="flex items-center gap-2.5">
            <motion.div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500"
              whileHover={{ rotate: 12, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}
            >
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z" />
              </svg>
            </motion.div>
            <span className="hidden font-heading text-lg font-bold tracking-tight sm:block">GeoConnect</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white sm:block">Log in</Link>
            <MagneticButton>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/register" className="inline-block rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-shadow hover:shadow-xl hover:shadow-blue-500/30 sm:px-5 sm:py-2.5 sm:text-sm">
                  Get Started
                </Link>
              </motion.div>
            </MagneticButton>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section id="hero" className="relative flex h-screen snap-start items-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ x: orbOffsetX, y: orbOffsetY }}>
          <div className="absolute left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/[0.07] blur-[120px]" />
          <div className="absolute right-[15%] top-[10%] h-[400px] w-[400px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
          <div className="absolute bottom-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-cyan-500/[0.04] blur-[80px]" />
        </motion.div>

        <ParticleField mouseX={mouseX} mouseY={mouseY} />

        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }} />

        <motion.div className="relative mx-auto flex w-full max-w-7xl items-center px-4 pt-14 sm:px-6 sm:pt-16 lg:px-8" style={{ y: heroParallax }}>
          <div className="grid w-full items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="max-w-xl">
              <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 backdrop-blur-sm sm:mb-8 sm:gap-2.5 sm:px-4 sm:py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs text-gray-400 sm:text-sm">
                  {typedBadge}
                  {!badgeDone && <span className="landing-cursor ml-0.5 inline-block h-4 w-[2px] bg-blue-400 align-middle" />}
                </span>
              </motion.div>

              {/* Split-word hero heading */}
              <motion.h1 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[4.5rem]">
                {['Explore', 'the', 'world.'].map((word, i) => (
                  <motion.span key={word} className="mr-[0.3em] inline-block text-white"
                    initial={{ opacity: 0, y: 50, filter: 'blur(12px)', rotateX: 40 }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {word}
                  </motion.span>
                ))}
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  {['Connect', 'everyone.'].map((word, i) => (
                    <motion.span key={word} className="mr-[0.3em] inline-block"
                      initial={{ opacity: 0, y: 50, filter: 'blur(12px)', rotateX: 40 }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </motion.h1>

              <motion.p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-400 sm:mt-6 sm:text-base lg:text-lg"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
              >
                GeoConnect turns every location into a story. Pin your moments, find friends nearby, and explore the world like never before.
              </motion.p>

              <motion.div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65 }}
              >
                <MagneticButton>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Link to="/register"
                      className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-shadow hover:shadow-xl hover:shadow-blue-500/30 sm:gap-2.5 sm:px-7 sm:py-3.5 sm:text-sm"
                    >
                      Get Started
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.div>
                </MagneticButton>
                <MagneticButton strength={0.2}>
                  <motion.button onClick={() => scrollTo('games')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs font-medium text-gray-300 transition-colors hover:border-white/20 hover:text-white sm:px-6 sm:py-3.5 sm:text-sm"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Try the games
                  </motion.button>
                </MagneticButton>
              </motion.div>

              <motion.div className="mt-6 flex items-center gap-3 sm:mt-10 sm:gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <div className="flex -space-x-2">
                  {['from-blue-400 to-cyan-400', 'from-violet-400 to-pink-400', 'from-emerald-400 to-teal-400', 'from-orange-400 to-red-400'].map((g, i) => (
                    <motion.div key={i} className={`h-6 w-6 rounded-full bg-gradient-to-br ${g} ring-2 ring-[#050810] sm:h-8 sm:w-8`}
                      initial={{ x: -10 * i, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.1 + i * 0.08 }}
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">12,500+ users trust us</p>
                </div>
              </motion.div>
            </div>

            <motion.div className="hidden items-center justify-center lg:flex"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3 }}
            >
              <GlobeViz mouseX={mouseX} mouseY={mouseY} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <motion.div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/15 p-1.5"
            animate={{ borderColor: ['rgba(255,255,255,0.15)', 'rgba(59,130,246,0.4)', 'rgba(255,255,255,0.15)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <motion.div className="h-2 w-1 rounded-full bg-white/40" animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ MARQUEE ═════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-5">
        <div className="landing-marquee flex whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex shrink-0 items-center gap-10 pr-10">
              {['Interactive Maps', 'Real-time Connection', 'Location Sharing', 'Nearby Events', 'Direct Messaging', 'Collections', 'Place Reviews', 'Community Discovery'].map((text, i) => (
                <span key={`${setIdx}-${i}`} className="flex items-center gap-10 text-sm font-medium text-gray-500">
                  {text}
                  <span className="h-1 w-1 rounded-full bg-gradient-to-r from-blue-400 to-violet-400" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ LOGO CLOUD / TRUST ═══════════════════════════════════ */}
      <div className="relative border-b border-white/[0.04] bg-white/[0.01] py-10">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/20 mb-6">Built with leading technologies</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              { name: 'React', icon: 'M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68 0 1.69-1.83 2.93-4.37 3.68.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68 0-1.69 1.83-2.93 4.37-3.68-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9' },
              { name: 'Leaflet', icon: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.75 3.75L12 11.68 5.25 7.93 12 4.18zM5 9.07l6 3.33v6.53l-6-3.33V9.07zm8 9.86v-6.53l6-3.33v6.53l-6 3.33z' },
              { name: 'MongoDB', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
              { name: 'Node.js', icon: 'M12 1.85c-.27 0-.55.07-.78.2l-7.44 4.3c-.48.28-.78.8-.78 1.36v8.58c0 .56.3 1.08.78 1.36l1.95 1.12c.95.46 1.27.46 1.71.46 1.4 0 2.21-.85 2.21-2.33V8.44c0-.12-.09-.21-.21-.21h-.93c-.12 0-.22.09-.22.21v8.06c0 .66-.68 1.31-1.77.76L4.59 16.1a.26.26 0 01-.12-.22V7.3c0-.09.05-.17.12-.22l7.44-4.3a.26.26 0 01.25 0l7.44 4.3c.07.04.12.13.12.22v8.58c0 .09-.05.17-.12.22l-7.44 4.3c-.04.02-.08.03-.13.03-.04 0-.09-.01-.12-.03l-1.91-1.14c-.06-.03-.13-.05-.2-.02-.53.3-.63.34-1.13.51-.12.04-.31.11.07.32l2.48 1.47c.24.14.52.22.78.22s.54-.08.78-.22l7.44-4.3c.48-.28.78-.8.78-1.36V7.71c0-.56-.3-1.08-.78-1.36l-7.44-4.3c-.23-.13-.5-.2-.78-.2' },
              { name: 'Tailwind', icon: 'M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C13.36 10.8 14.5 12 17 12c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C15.64 7.2 14.5 6 12 6zM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C8.36 16.8 9.5 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C10.64 13.2 9.5 12 7 12z' },
            ].map((tech) => (
              <div key={tech.name} className="flex items-center gap-2 opacity-30 transition-opacity hover:opacity-60">
                <svg className="h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="currentColor"><path d={tech.icon} /></svg>
                <span className="text-xs font-mono text-white/40 tracking-wider">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FEATURES (Bento Grid + Click-to-Expand) ═════════════ */}
      <section id="features" className="relative h-screen snap-start">
        <div className="absolute left-[50%] top-[30%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/[0.03] blur-[120px]" />
        <div className="relative flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-7xl shrink-0">
            <Reveal variant="blur-in">
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-400 sm:text-xs">Features</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:mt-3 sm:text-3xl lg:text-5xl">
                  Everything you need,{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">on one map</span>
                </h2>
                <p className="mt-2 text-xs text-gray-500 sm:mt-3 sm:text-sm">A single platform for maps, connections, sharing, and discovery</p>
              </div>
            </Reveal>
          </div>

          <div className="mx-auto mt-3 w-full max-w-7xl flex-1 min-h-0 overflow-y-auto landing-section-inner sm:mt-4 lg:mt-6">
            <StaggerContainer className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3" stagger={0.1}>
              {FEATURES.map((feat, i) => (
                <StaggerItem key={feat.subtitle} variant="blur" className={feat.large ? 'lg:col-span-2' : ''}>
                  <TiltCard className="h-full">
                    <motion.div
                      className="group relative h-full cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 backdrop-blur-sm transition-all hover:border-white/[0.12] hover:bg-white/[0.04] sm:rounded-2xl sm:p-5 lg:p-6"
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => toggleFeature(i)}
                    >
                      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"
                        style={{ backgroundColor: feat.color + '18' }}
                      />
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11 sm:rounded-xl"
                        style={{ backgroundColor: feat.color + '15', color: feat.color }}
                      >
                        {feat.icon}
                      </div>

                      <div className="relative mt-3 sm:mt-4">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] sm:text-[10px]" style={{ color: feat.color }}>{feat.subtitle}</p>
                        <h3 className="mt-1 font-heading text-base font-bold text-white sm:mt-1.5 sm:text-lg lg:text-xl">{feat.title}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-400 sm:mt-2 sm:text-sm">{feat.desc}</p>

                        <AnimatePresence>
                          {expandedFeature === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-gray-300 sm:text-sm">
                                {feat.detail}
                              </p>
                              <Link to="/register" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-white" style={{ color: feat.color }}>
                                Learn more
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </Link>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <p className="mt-2 font-mono text-[9px] text-gray-600 transition-colors group-hover:text-gray-400 sm:mt-3 sm:text-[10px]">
                          {expandedFeature === i ? 'Click to collapse' : 'Click for details'}
                        </p>
                      </div>
                    </motion.div>
                  </TiltCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════ */}
      <section id="how-works" className="relative h-screen snap-start">
        <div className="absolute right-[20%] top-[50%] h-[400px] w-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
        <div className="relative flex h-full flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-7xl">
            <Reveal variant="scale-up">
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400 sm:text-xs">How it works</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:mt-3 sm:text-3xl lg:text-5xl">Three steps to get started</h2>
              </div>
            </Reveal>

            <div className="mx-auto mt-6 max-w-5xl sm:mt-8 lg:mt-10">
              <StaggerContainer className="relative grid gap-6 md:grid-cols-3 md:gap-5" stagger={0.15}>
                <div className="absolute left-[16.67%] right-[16.67%] top-10 hidden h-px bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-emerald-500/30 md:block" />
                {STEPS.map((step) => (
                  <StaggerItem key={step.num} variant="up">
                    <motion.div className="relative text-center" whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <div className="relative mx-auto flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                        <motion.div className="absolute inset-0 rounded-full opacity-10" style={{ backgroundColor: step.color }} whileHover={{ opacity: 0.2, scale: 1.1 }} />
                        <span className="font-mono text-2xl font-extrabold sm:text-3xl" style={{ color: step.color }}>{step.num}</span>
                      </div>
                      <h3 className="mt-3 font-heading text-base font-bold text-white sm:mt-4 sm:text-lg lg:text-xl">{step.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-400 sm:mt-2 sm:text-sm">{step.desc}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ APP PREVIEW ═════════════════════════════════════════ */}
      <section id="preview" className="relative h-screen snap-start">
        <div className="absolute left-[30%] top-[40%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px]" />
        <div className="relative flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-5xl shrink-0">
            <Reveal variant="blur-in">
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400 sm:text-xs">Product</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:mt-3 sm:text-3xl lg:text-5xl">
                  Interface designed{' '}
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">for you</span>
                </h2>
                <p className="mt-2 hidden text-gray-500 sm:block sm:mt-3 sm:text-sm">A smooth, intuitive, and beautiful map experience on every device</p>
              </div>
            </Reveal>
          </div>

          <div className="mx-auto mt-3 w-full max-w-5xl flex-1 min-h-0 overflow-y-auto landing-section-inner sm:mt-4 lg:mt-6">
            <Reveal delay={0.15} variant="slide-rotate">
              <AppShowcase />
            </Reveal>

            <StaggerContainer className="mt-3 hidden gap-3 sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-4" stagger={0.1}>
              {[
                { label: 'Dark Mode', desc: 'Beautiful dark interface, easy on the eyes', color: '#8b5cf6' },
                { label: 'Real-time', desc: 'Live friend locations updated instantly', color: '#3b82f6' },
                { label: 'Responsive', desc: 'Optimized for every device, mobile to desktop', color: '#06b6d4' },
              ].map((item) => (
                <StaggerItem key={item.label} variant="scale">
                  <motion.div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center backdrop-blur-sm transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-4"
                    whileHover={{ y: -3, scale: 1.02 }}
                  >
                    <p className="font-mono text-[10px] tracking-wider sm:text-xs" style={{ color: item.color }}>{item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ═══ PIN TAPPER GAME ═════════════════════════════════════ */}
      <section id="games" className="relative h-screen snap-start">
        <div className="absolute left-[20%] top-[30%] h-[400px] w-[400px] rounded-full bg-violet-500/[0.04] blur-[100px]" />
        <div className="relative flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl shrink-0">
            <Reveal variant="scale-up">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400 sm:text-xs">Mini Game</p>
                <h2 className="mt-2 font-heading text-xl font-bold text-white sm:mt-3 sm:text-2xl lg:text-4xl">
                  Test your{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">reflexes</span>
                </h2>
                <p className="mx-auto mt-1.5 hidden max-w-lg text-gray-500 sm:block sm:mt-2 sm:text-sm">
                  How fast can you tap? Pins pop up randomly — click them before they disappear!
                </p>
              </div>
            </Reveal>
          </div>

          <div className="mx-auto mt-2 w-full max-w-5xl flex-1 min-h-0 sm:mt-3 lg:mt-4">
            <Reveal delay={0.15} variant="blur-in" className="h-full">
              <div className="h-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-2 backdrop-blur-sm sm:rounded-2xl sm:p-3">
                <Suspense fallback={<GameSpinner />}>
                  <PinTapper />
                </Suspense>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ LOCATION GUESSER GAME ═══════════════════════════════ */}
      <section id="geo-game" className="relative h-screen snap-start">
        <div className="absolute right-[20%] top-[30%] h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
        <div className="relative flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl shrink-0">
            <Reveal variant="scale-up">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-400 sm:text-xs">Mini Game</p>
                <h2 className="mt-2 font-heading text-xl font-bold text-white sm:mt-3 sm:text-2xl lg:text-4xl">
                  How good is your{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">geography?</span>
                </h2>
                <p className="mx-auto mt-1.5 hidden max-w-lg text-gray-500 sm:block sm:mt-2 sm:text-sm">
                  Challenge yourself — click the map to place your guess and see how close you get!
                </p>
              </div>
            </Reveal>
          </div>

          <div className="mx-auto mt-2 w-full max-w-5xl flex-1 min-h-0 sm:mt-3 lg:mt-4">
            <Reveal delay={0.15} variant="blur-in" className="h-full">
              <div className="h-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-2 backdrop-blur-sm sm:rounded-2xl sm:p-3">
                <Suspense fallback={<GameSpinner />}>
                  <LocationGuesser />
                </Suspense>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ════════════════════════════════════════ */}
      <section id="testimonials" className="relative flex h-screen snap-start flex-col justify-center">
        <div className="absolute left-[40%] top-[40%] h-[400px] w-[400px] rounded-full bg-pink-500/[0.03] blur-[100px]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="blur-in">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400 sm:text-xs">Testimonials</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:mt-3 sm:text-3xl lg:text-5xl">
                What people say about{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">GeoConnect</span>
              </h2>
            </div>
          </Reveal>
          <div className="mt-6 sm:mt-8"><TestimonialCarousel /></div>
        </div>
      </section>

      {/* ═══ FAQ ══════════════════════════════════════════════════ */}
      <section id="faq" className="relative h-screen snap-start">
        <div className="absolute right-[30%] top-[40%] h-[400px] w-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
        <div className="relative flex h-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-7xl shrink-0">
            <Reveal variant="blur-in">
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400 sm:text-xs">FAQ</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:mt-3 sm:text-3xl lg:text-5xl">
                  Questions?{' '}
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Answered</span>
                </h2>
                <p className="mt-2 hidden text-gray-500 sm:block sm:mt-3 sm:text-sm">Everything you need to know about GeoConnect</p>
              </div>
            </Reveal>
          </div>
          <div className="mx-auto mt-3 w-full max-w-7xl flex-1 min-h-0 overflow-y-auto landing-section-inner sm:mt-4 lg:mt-6">
            <Reveal delay={0.1} variant="fade-up">
              <FAQ />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══════════════════════════════════════════════ */}
      <section id="community" className="relative flex h-screen snap-start flex-col justify-center">
        <div className="absolute left-[20%] top-[50%] h-[500px] w-[500px] rounded-full bg-blue-500/[0.04] blur-[120px]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl lg:text-5xl">
                Community is{' '}
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">growing</span>
              </h2>
              <p className="mx-auto mt-2 max-w-md text-xs text-gray-500 sm:mt-3 sm:text-sm">Thousands of users trust and love GeoConnect every day</p>
            </div>
          </Reveal>

          <StaggerContainer className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 lg:grid-cols-4 lg:gap-5" stagger={0.1}>
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══ CTA + FOOTER ═══════════════════════════════════════ */}
      <section id="cta" className="relative flex h-screen snap-start flex-col overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[#050810]" />
        <div className="absolute left-1/2 top-[40%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-500/[0.07] via-violet-500/[0.05] to-transparent blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        {/* Floating decorative pins */}
        {[
          { x: '8%', y: '18%', d: 2, c: '#3b82f6' },
          { x: '88%', y: '12%', d: 0.5, c: '#8b5cf6' },
          { x: '4%', y: '65%', d: 3.5, c: '#06b6d4' },
          { x: '92%', y: '58%', d: 1.5, c: '#10b981' },
          { x: '20%', y: '82%', d: 4, c: '#f59e0b' },
          { x: '78%', y: '78%', d: 2.5, c: '#8b5cf6' },
        ].map((pin, i) => (
          <motion.div
            key={i}
            className="absolute hidden lg:block"
            style={{ left: pin.x, top: pin.y }}
            animate={{ y: [0, -15, 0], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, delay: pin.d, ease: 'easeInOut' }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={pin.c} strokeWidth="1.5" opacity="0.5">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z" />
            </svg>
          </motion.div>
        ))}

        {/* Main CTA content */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6">
          {/* Live badge */}
          <Reveal variant="fade-up">
            <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-xs text-gray-400">12,500+ explorers online</span>
            </div>
          </Reveal>

          {/* Big heading */}
          <Reveal variant="scale-up" delay={0.1}>
            <h2 className="mt-8 max-w-4xl text-center font-heading text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-7xl">
              Your next{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">adventure</span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 block h-[3px] rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 lg:-bottom-2 lg:h-1"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  viewport={{ once: false }}
                />
              </span>
              <br className="hidden sm:block" />
              is one click away
            </h2>
          </Reveal>

          <Reveal variant="fade-up" delay={0.2}>
            <p className="mt-6 max-w-lg text-center text-base text-gray-400 sm:text-lg">
              Join a global community of explorers. Share your favorite spots, discover hidden gems, and connect through places that matter.
            </p>
          </Reveal>

          {/* CTA buttons */}
          <Reveal variant="fade-up" delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <MagneticButton>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/register"
                    className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 px-8 py-4 text-sm font-bold text-white shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
                  >
                    <span className="relative z-10 flex items-center gap-2.5">
                      Get Started Free
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                  </Link>
                </motion.div>
              </MagneticButton>
              <MagneticButton>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/[0.2] hover:bg-white/[0.06]"
                  >
                    Sign in
                  </Link>
                </motion.div>
              </MagneticButton>
            </div>
          </Reveal>

          {/* Trust line */}
          <Reveal variant="fade-up" delay={0.4}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {['Free forever', 'No credit card', 'Privacy first'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-xs text-gray-500">{item}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Compact footer */}
        <footer className="relative shrink-0 border-t border-white/[0.04] py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row lg:px-8">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-500">
                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white/40">GeoConnect</span>
            </div>
            <div className="flex items-center gap-5">
              {['Terms', 'Privacy', 'Blog', 'Contact'].map((item) => (
                <a key={item} href="#" className="text-xs text-gray-600 transition-colors hover:text-white/60">{item}</a>
              ))}
            </div>
            <p className="text-xs text-gray-700">&copy; {new Date().getFullYear()} GeoConnect</p>
          </div>
        </footer>
      </section>

      {/* ═══ MOBILE SECTION NAV ═══════════════════════════════════ */}
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 lg:hidden">
        <div className="flex items-center gap-1.5 rounded-full px-3 py-2 backdrop-blur-xl" style={{ background: 'rgba(5,8,16,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {SECTION_NAV.map((sec, i) => (
            <button key={sec.id} onClick={() => scrollTo(sec.id)}
              className="relative h-2 w-2 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background: activeSection === i
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'rgba(255,255,255,0.15)',
                transform: activeSection === i ? 'scale(1.4)' : 'scale(1)',
                boxShadow: activeSection === i ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
              }}
              aria-label={sec.label}
            />
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
