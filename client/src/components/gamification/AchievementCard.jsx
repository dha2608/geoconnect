import { motion } from 'framer-motion';

const tierStyles = {
  bronze: {
    border: 'border-amber-700/30',
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    glow: 'hover:shadow-amber-700/20',
    ring: 'ring-amber-600/30',
  },
  silver: {
    border: 'border-slate-400/30',
    bg: 'bg-slate-600/20',
    text: 'text-slate-300',
    glow: 'hover:shadow-slate-400/20',
    ring: 'ring-slate-400/30',
  },
  gold: {
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-600/20',
    text: 'text-yellow-400',
    glow: 'hover:shadow-yellow-500/20',
    ring: 'ring-yellow-500/30',
  },
  platinum: {
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-600/20',
    text: 'text-cyan-300',
    glow: 'hover:shadow-cyan-400/20',
    ring: 'ring-cyan-400/30',
  },
  diamond: {
    border: 'border-violet-400/30',
    bg: 'bg-violet-600/20',
    text: 'text-violet-300',
    glow: 'hover:shadow-violet-400/30',
    ring: 'ring-violet-400/30',
  },
};

const categoryLabels = {
  first_steps: 'First Steps',
  social: 'Social',
  content: 'Content',
  explorer: 'Explorer',
  streak: 'Streak',
  special: 'Special',
};

export default function AchievementCard({
  achievement,
  earned = false,
  earnedAt = null,
  compact = false,
  className = '',
}) {
  const tier = tierStyles[achievement?.tier] || tierStyles.bronze;

  if (compact) {
    return (
      <motion.div
        className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
          earned
            ? 'bg-surface-hover'
            : 'bg-surface-hover/50 opacity-50'
        } ${className}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
      >
        <span className="text-xl leading-none" role="img" aria-label={achievement?.name}>
          {achievement?.icon || '🏆'}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate ${earned ? 'text-txt-primary' : 'text-txt-muted'}`}>
            {achievement?.name}
          </p>
          {earned && (
            <p className="text-[10px] text-txt-muted">+{achievement?.xpReward} XP</p>
          )}
        </div>
        {!earned && (
          <div className="w-5 h-5 rounded-full border border-surface-divider flex items-center justify-center">
            <span className="text-[10px] text-txt-muted">?</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`glass p-4 relative overflow-hidden group cursor-default ${
        earned ? '' : 'opacity-60 grayscale'
      } ${tier.glow} hover:shadow-lg transition-shadow ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: earned ? 1 : 0.6, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03 }}
    >
      {/* Tier accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${tier.bg} opacity-60`} />

      {/* Icon + info */}
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl ${tier.bg} ${tier.border} border flex items-center justify-center shrink-0`}
        >
          <span className="text-2xl leading-none" role="img" aria-label={achievement?.name}>
            {achievement?.icon || '🏆'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-txt-primary truncate">
              {achievement?.name}
            </h4>
            <span
              className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full ${tier.bg} ${tier.text}`}
            >
              {achievement?.tier}
            </span>
          </div>
          <p className="text-xs text-txt-secondary line-clamp-2">
            {achievement?.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-surface-divider">
        <span className="text-[10px] text-txt-muted uppercase tracking-wide">
          {categoryLabels[achievement?.category] || achievement?.category}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-accent-primary">
            +{achievement?.xpReward} XP
          </span>
          {earned && earnedAt && (
            <span className="text-[10px] text-txt-muted">
              {new Date(earnedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Earned checkmark */}
      {earned && (
        <motion.div
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-success/20 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        >
          <svg className="w-3 h-3 text-accent-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      {/* Hidden overlay for locked */}
      {!earned && achievement?.isHidden && (
        <div className="absolute inset-0 glass flex items-center justify-center bg-base/60">
          <div className="text-center">
            <span className="text-2xl">🔒</span>
            <p className="text-xs text-txt-muted mt-1">Hidden Achievement</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
