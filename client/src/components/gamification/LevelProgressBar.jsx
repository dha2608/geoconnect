import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  selectTotalXP,
  selectLevel,
  selectLevelTitle,
  selectLevels,
} from '../../features/gamification/gamificationSlice';

const tierColors = {
  Newcomer: 'from-slate-400 to-slate-500',
  Explorer: 'from-emerald-400 to-emerald-600',
  Contributor: 'from-blue-400 to-blue-600',
  Trailblazer: 'from-violet-400 to-violet-600',
  Champion: 'from-amber-400 to-amber-600',
  Legend: 'from-rose-400 via-fuchsia-500 to-violet-500',
};

const tierGlow = {
  Newcomer: 'shadow-slate-500/20',
  Explorer: 'shadow-emerald-500/20',
  Contributor: 'shadow-blue-500/20',
  Trailblazer: 'shadow-violet-500/20',
  Champion: 'shadow-amber-500/20',
  Legend: 'shadow-fuchsia-500/30',
};

export default function LevelProgressBar({ compact = false, className = '' }) {
  const totalXP = useSelector(selectTotalXP);
  const level = useSelector(selectLevel);
  const levelTitle = useSelector(selectLevelTitle);
  const levels = useSelector(selectLevels);

  // Calculate progress to next level
  const currentLevelData = levels?.[level - 1];
  const nextLevelData = levels?.[level];
  const currentThreshold = currentLevelData?.minXP ?? 0;
  const nextThreshold = nextLevelData?.minXP ?? currentThreshold;
  const isMaxLevel = !nextLevelData;

  const xpInLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = isMaxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  const gradient = tierColors[levelTitle] || tierColors.Newcomer;
  const glow = tierGlow[levelTitle] || tierGlow.Newcomer;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white`}
        >
          Lv.{level}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-[10px] text-txt-muted tabular-nums">
          {totalXP?.toLocaleString()} XP
        </span>
      </div>
    );
  }

  return (
    <div className={`glass p-4 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Level badge */}
          <motion.div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow}`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <span className="text-white font-bold text-sm">{level}</span>
          </motion.div>

          <div>
            <h4 className="text-sm font-semibold text-txt-primary">
              {levelTitle}
            </h4>
            <p className="text-xs text-txt-secondary">
              {isMaxLevel
                ? 'Max level reached'
                : `${xpNeeded - xpInLevel} XP to next level`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-bold text-txt-primary tabular-nums">
            {totalXP?.toLocaleString()}
          </span>
          <span className="text-xs text-txt-muted ml-1">XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 rounded-full bg-surface-hover overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ width: `${progress}%` }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        />
      </div>

      {/* XP range labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-txt-muted tabular-nums">
          {currentThreshold.toLocaleString()}
        </span>
        <span className="text-[10px] text-txt-muted tabular-nums">
          {isMaxLevel ? 'MAX' : nextThreshold.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
