import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { setActivePanel, openModal } from '../../features/ui/uiSlice';

// ─── Tour step definitions ────────────────────────────────────────────────────
const buildSteps = (dispatch) => [
  {
    id: 'welcome',
    title: 'Welcome to GeoConnect 👋',
    description:
      "Explore a location-based social network where the world is your canvas. Let's take a quick tour!",
    position: 'center',
    icon: '🌍',
    target: null, // No highlight — centered card
  },
  {
    id: 'map',
    title: 'Explore the Map',
    description:
      'The interactive map is your home base. Coloured pins mark posts, events, and check-ins from people nearby. Tap any pin to dive in.',
    position: 'bottom-center',
    icon: '🗺️',
    target: '.leaflet-container', // Highlight the map
  },
  {
    id: 'create-pin',
    title: 'Create a Pin',
    description:
      'Drop a pin anywhere to share a moment — a photo, a story, or a tip. Hit the "+" button to get started.',
    position: 'top-left',
    icon: '📍',
    target: '[data-tour="create-button"]', // MobileNav create FAB or sidebar button
    action: () => dispatch(openModal({ modal: 'createPin' })),
  },
  {
    id: 'discover',
    title: 'Discover Content',
    description:
      'The Feed panel surfaces the freshest posts from people and places you care about. Swipe open the sidebar or tap the feed icon.',
    position: 'right',
    icon: '✨',
    target: '[data-tour="sidebar"]',
    action: () => dispatch(setActivePanel('feed')),
  },
  {
    id: 'connect',
    title: 'Connect with People',
    description:
      'Follow locals, send messages, and build your community — all from within the app.',
    position: 'right',
    icon: '🤝',
    target: '[data-tour="sidebar"]',
    action: () => dispatch(setActivePanel('messages')),
  },
  {
    id: 'command-palette',
    title: 'Quick Navigation',
    description:
      'Press Ctrl+K (or Cmd+K on Mac) to open a lightning-fast command palette for navigating anywhere instantly.',
    position: 'center',
    icon: '⌨️',
    target: null,
  },
  {
    id: 'done',
    title: "You're all set! 🎉",
    description:
      "Go explore, drop some pins, and make new connections. Sign in anytime to unlock all features. Happy exploring!",
    position: 'center',
    icon: '🚀',
    target: null,
  },
];

// ─── Spotlight overlay — dims everything except the target ────────────────────
function SpotlightOverlay({ rect }) {
  if (!rect) {
    // No target — light dim overlay only
    return <div className="absolute inset-0 bg-black/40 transition-all duration-500" />;
  }

  const pad = 12; // padding around highlighted element
  return (
    <div
      className="absolute inset-0 transition-all duration-500 pointer-events-none"
      style={{
        boxShadow: `0 0 0 9999px rgba(0,0,0,0.55), 0 0 30px 4px rgba(59,130,246,0.15) inset`,
        // Create a transparent "hole" using clip-path
        clipPath: `polygon(
          0% 0%, 0% 100%, 
          ${rect.left - pad}px 100%, 
          ${rect.left - pad}px ${rect.top - pad}px, 
          ${rect.right + pad}px ${rect.top - pad}px, 
          ${rect.right + pad}px ${rect.bottom + pad}px, 
          ${rect.left - pad}px ${rect.bottom + pad}px, 
          ${rect.left - pad}px 100%, 
          100% 100%, 100% 0%
        )`,
      }}
    />
  );
}

// ─── Compute tooltip position relative to target ──────────────────────────────
function getTooltipStyle(position, rect) {
  if (!rect || position === 'center') {
    return {
      wrapper: 'inset-0 flex items-center justify-center',
      card: 'w-full max-w-md mx-4',
    };
  }

  const pad = 20;

  switch (position) {
    case 'bottom-center':
      return {
        wrapper: `inset-x-0 flex justify-center px-4`,
        card: 'w-full max-w-md',
        style: { top: rect.bottom + pad },
      };
    case 'top-left':
      return {
        wrapper: 'flex',
        card: 'w-80',
        style: { bottom: window.innerHeight - rect.top + pad, right: window.innerWidth - rect.right },
      };
    case 'top-right':
      return {
        wrapper: 'flex',
        card: 'w-80',
        style: { bottom: window.innerHeight - rect.top + pad, left: rect.left },
      };
    case 'right':
      return {
        wrapper: 'flex',
        card: 'w-80',
        style: { top: rect.top, left: rect.right + pad },
      };
    case 'left':
      return {
        wrapper: 'flex',
        card: 'w-80',
        style: { top: rect.top, right: window.innerWidth - rect.left + pad },
      };
    default:
      return {
        wrapper: 'inset-0 flex items-center justify-center',
        card: 'w-full max-w-md mx-4',
      };
  }
}

// ─── Spring animation variants ────────────────────────────────────────────────
const cardVariants = {
  enter: { opacity: 0, scale: 0.88, y: 16 },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 260 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: -12,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

// ─── Confetti particle ────────────────────────────────────────────────────────
function ConfettiParticle({ index }) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const color = colors[index % colors.length];
  const x = Math.random() * 400 - 200;
  const y = Math.random() * -300 - 50;
  const rotate = Math.random() * 720 - 360;

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{ backgroundColor: color, top: '50%', left: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x, y, opacity: 0, rotate, scale: 0.4 }}
      transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut', delay: Math.random() * 0.3 }}
    />
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-accent-primary"
          animate={{
            width: i === current ? 20 : 6,
            height: 6,
            opacity: i === current ? 1 : i < current ? 0.6 : 0.25,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingTour({ onComplete }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const steps = buildSteps(dispatch);

  const [stepIndex, setStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [direction, setDirection] = useState(1);
  const [targetRect, setTargetRect] = useState(null);

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Find and track target element position
  useEffect(() => {
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to allow panels to open first
    const timer = setTimeout(findTarget, 300);

    // Update on resize/scroll
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
    };
  }, [currentStep.target, stepIndex]);

  // Trigger confetti on final step
  useEffect(() => {
    if (isLast) setShowConfetti(true);
  }, [isLast]);

  const markComplete = useCallback(() => {
    localStorage.setItem('geoconnect_onboarding_complete', 'true');
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markComplete();
      return;
    }
    // Run optional step action (opens panel/modal for context)
    const nextStep = steps[stepIndex + 1];
    nextStep?.action?.();
    setDirection(1);
    setStepIndex((i) => i + 1);
  }, [isLast, markComplete, steps, stepIndex]);

  const handleSkip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  // Keyboard: Escape to skip, Enter/Right for next, Left for back
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'Enter' || e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setDirection(-1);
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSkip, handleNext, stepIndex]);

  const tooltipPos = getTooltipStyle(currentStep.position, targetRect);

  return (
    <motion.div
      className="fixed inset-0 z-[200]"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Spotlight overlay — dims everything except the target element */}
      <SpotlightOverlay rect={targetRect} />

      {/* Highlight ring around target */}
      {targetRect && (
        <motion.div
          className="absolute rounded-lg border-2 border-blue-400/50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            top: targetRect.top - 12,
            left: targetRect.left - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
            boxShadow: '0 0 20px rgba(59,130,246,0.2), 0 0 60px rgba(59,130,246,0.05)',
          }}
        />
      )}

      {/* Confetti layer (final step only) */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Tooltip card */}
      <div
        className={`absolute ${tooltipPos.wrapper} pointer-events-none`}
        style={tooltipPos.style}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            className={`${tooltipPos.card} pointer-events-auto`}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
          >
            {/* Glass card */}
            <div className="glass rounded-xl border border-surface-divider p-6 shadow-2xl">
              {/* Step counter + skip */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">
                  Step {stepIndex + 1} of {steps.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-xs text-txt-muted hover:text-txt-primary transition-colors duration-150 underline underline-offset-2"
                >
                  Skip tour
                </button>
              </div>

              {/* Icon + Title */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl leading-none select-none">{currentStep.icon}</span>
                <h2 className="text-lg font-bold text-txt-primary leading-snug pt-0.5">
                  {currentStep.title}
                </h2>
              </div>

              {/* Description */}
              <p className="text-sm text-txt-muted leading-relaxed mb-6">
                {currentStep.description}
              </p>

              {/* Login nudge for unauthenticated users */}
              {!isAuthenticated && currentStep.id === 'done' && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                  <svg className="h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span className="text-xs text-blue-300">
                    <a href="/login" className="font-semibold underline underline-offset-2 hover:text-white">Sign in</a> or <a href="/register" className="font-semibold underline underline-offset-2 hover:text-white">create an account</a> to unlock all features!
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-3">
                <ProgressDots total={steps.length} current={stepIndex} />

                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <button
                      onClick={() => {
                        setDirection(-1);
                        setStepIndex((i) => i - 1);
                      }}
                      className="px-3 py-1.5 text-sm text-txt-muted hover:text-txt-primary rounded-lg hover:bg-white/10 transition-colors duration-150"
                    >
                      Back
                    </button>
                  )}
                  <motion.button
                    onClick={handleNext}
                    className="px-4 py-1.5 text-sm font-semibold bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity duration-150"
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {isLast ? '🎉 Let\u0027s go!' : 'Next →'}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -inset-1 rounded-xl bg-accent-violet/20 blur-xl -z-10 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
