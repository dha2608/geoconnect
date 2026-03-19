import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setActivePanel, openModal } from '../../features/ui/uiSlice';

// ─── Tour step definitions ────────────────────────────────────────────────────
const buildSteps = (dispatch) => [
  {
    id: 'welcome',
    title: 'Welcome to GeoConnect 👋',
    description:
      "You've just joined a location-based social network where the world is your canvas. Let's take a quick tour to get you started!",
    position: 'center',
    icon: '🌍',
  },
  {
    id: 'map',
    title: 'Explore the Map',
    description:
      'The interactive map is your home base. Coloured pins mark posts, events, and check-ins from people nearby. Tap any pin to dive in.',
    position: 'top-center',
    icon: '🗺️',
  },
  {
    id: 'create-pin',
    title: 'Create a Pin',
    description:
      'Drop a pin anywhere on the map to share a moment — a photo, a story, or a tip about that exact spot. Hit the "+" button to get started.',
    position: 'bottom-right',
    icon: '📍',
    action: () => dispatch(openModal({ modal: 'createPin' })),
  },
  {
    id: 'discover',
    title: 'Discover Content',
    description:
      'The Feed panel surfaces the freshest posts from people and places you care about. Swipe open the sidebar or tap the feed icon to browse.',
    position: 'bottom-left',
    icon: '✨',
    action: () => dispatch(setActivePanel('feed')),
  },
  {
    id: 'connect',
    title: 'Connect with People',
    description:
      'Follow locals, slide into DMs, and build your community — all from within the app. Tap any avatar to visit a profile.',
    position: 'bottom-right',
    icon: '🤝',
    action: () => dispatch(setActivePanel('messages')),
  },
  {
    id: 'activity',
    title: 'Track Your Activity',
    description:
      'The Activity dashboard shows your pins, likes, followers, and check-in history at a glance. Access it from your profile any time.',
    position: 'bottom-left',
    icon: '📊',
    action: () => dispatch(setActivePanel('profile')),
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description:
      'Power users love this: press Cmd+K (or Ctrl+K on Windows) to open a lightning-fast command palette for navigating anywhere instantly.',
    position: 'top-center',
    icon: '⌨️',
  },
  {
    id: 'done',
    title: "You're all set! 🎉",
    description:
      "That's the full tour. Go explore, drop some pins, and make new connections. The world is waiting — happy exploring!",
    position: 'center',
    icon: '🚀',
  },
];

// ─── Tooltip position styles ──────────────────────────────────────────────────
const POSITION_STYLES = {
  center: {
    wrapper: 'inset-0 flex items-center justify-center',
    card: 'w-full max-w-md mx-4',
  },
  'top-center': {
    wrapper: 'inset-x-0 top-24 flex justify-center px-4',
    card: 'w-full max-w-md',
  },
  'bottom-right': {
    wrapper: 'bottom-24 right-6 flex justify-end',
    card: 'w-80',
  },
  'bottom-left': {
    wrapper: 'bottom-24 left-20 flex justify-start',
    card: 'w-80',
  },
};

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

// ─── Confetti particle (for the final step) ───────────────────────────────────
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
  const steps = buildSteps(dispatch);

  const [stepIndex, setStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

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
    currentStep.action?.();
    setDirection(1);
    setStepIndex((i) => i + 1);
  }, [isLast, markComplete, currentStep]);

  const handleSkip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const posStyle = POSITION_STYLES[currentStep.position] ?? POSITION_STYLES.center;

  return (
    <motion.div
      className="fixed inset-0 z-[200]"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Darkened overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Confetti layer (final step only) */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Tooltip card, repositioned per step */}
      <div className={`absolute ${posStyle.wrapper} pointer-events-none`}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            className={`${posStyle.card} pointer-events-auto`}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
          >
            {/* Glass card */}
            <div className="glass rounded-xl border border-surface-divider p-6 shadow-2xl">
              {/* Step counter */}
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

              {/* Footer row */}
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
