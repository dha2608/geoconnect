import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDailyChallenges,
  selectDailyChallenges,
} from '../../features/gamification/gamificationSlice';

const challengeIcons = {
  create_pin: '📍',
  create_post: '📝',
  check_in: '📌',
  follow_user: '👤',
  comment_post: '💬',
  write_review: '⭐',
  attend_event: '🎉',
  explore_category: '🗂️',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { ease: [0.16, 1, 0.3, 1] } },
};

export default function DailyChallenges({ className = '' }) {
  const dispatch = useDispatch();
  const challenges = useSelector(selectDailyChallenges);

  useEffect(() => {
    dispatch(fetchDailyChallenges());
  }, [dispatch]);

  if (!challenges?.length) return null;

  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <div className={`glass p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🎯</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Daily Challenges
          </h3>
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {completedCount}/{challenges.length}
        </span>
      </div>

      {/* Challenges list */}
      <motion.div
        className="space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {challenges.map((challenge, idx) => {
          const progress = Math.min(
            (challenge.progress / challenge.target) * 100,
            100
          );

          return (
            <motion.div
              key={challenge.key || idx}
              variants={itemVariants}
              className={`relative p-3 rounded-xl border transition-colors ${
                challenge.completed
                  ? 'border-accent-success/20 bg-accent-success/5'
                  : 'border-[var(--surface-divider)] bg-[var(--surface-hover)]/50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5" role="img" aria-hidden>
                  {challengeIcons[challenge.key] || '🎯'}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs font-medium ${
                        challenge.completed
                          ? 'text-accent-success line-through'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {challenge.description}
                    </p>
                    <span className="text-[10px] font-semibold text-accent-primary shrink-0">
                      +{challenge.xpReward} XP
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          challenge.completed
                            ? 'bg-accent-success'
                            : 'bg-accent-primary'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{
                          duration: 0.6,
                          ease: [0.16, 1, 0.3, 1],
                          delay: idx * 0.1,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
                      {challenge.progress}/{challenge.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completed checkmark */}
              {challenge.completed && (
                <motion.div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent-success/20 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <svg
                    className="w-2.5 h-2.5 text-accent-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* All complete bonus */}
      {completedCount === challenges.length && challenges.length > 0 && (
        <motion.div
          className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-accent-primary/10 to-accent-violet/10 border border-accent-primary/20 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <p className="text-xs font-semibold text-accent-primary">
            🎊 All challenges complete! Bonus XP earned!
          </p>
        </motion.div>
      )}
    </div>
  );
}
