import mongoose from 'mongoose';

/**
 * Per-user gamification state.
 *
 * Tracks XP, level, streaks, daily challenges, and earned achievements.
 * One document per user (1:1 relationship with User).
 */

// ─── Level Thresholds ──────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, title: 'Newcomer',    minXP: 0 },
  { level: 2, title: 'Explorer',    minXP: 100 },
  { level: 3, title: 'Contributor', minXP: 500 },
  { level: 4, title: 'Trailblazer', minXP: 1500 },
  { level: 5, title: 'Champion',    minXP: 5000 },
  { level: 6, title: 'Legend',      minXP: 15000 },
];

/**
 * Compute level from total XP.
 * @param {number} xp
 * @returns {{ level: number, title: string, minXP: number, nextLevelXP: number | null }}
 */
export function computeLevel(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) current = l;
    else break;
  }
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const nextLevelXP = nextIdx < LEVELS.length ? LEVELS[nextIdx].minXP : null;
  return { ...current, nextLevelXP };
}

// ─── Daily Challenge Sub-Schema ────────────────────────────────────────────────
const dailyChallengeSchema = new mongoose.Schema({
  key: { type: String, required: true },        // e.g. 'create_pin', 'checkin_2', 'like_5'
  description: { type: String, required: true },
  xpReward: { type: Number, required: true },
  target: { type: Number, required: true },      // How many actions needed
  progress: { type: Number, default: 0 },        // Current count
  completed: { type: Boolean, default: false },
}, { _id: false });

// ─── XP Transaction Log (recent) ──────────────────────────────────────────────
const xpLogSchema = new mongoose.Schema({
  action: { type: String, required: true },      // 'pin_create', 'checkin', 'daily_login', etc.
  amount: { type: Number, required: true },
  meta: { type: mongoose.Schema.Types.Mixed },   // { pinId, postId, etc. }
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// ─── Main Schema ───────────────────────────────────────────────────────────────
const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // XP & Level
  totalXP: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  levelTitle: { type: String, default: 'Newcomer' },

  // Streaks
  loginStreak: { type: Number, default: 0 },
  longestLoginStreak: { type: Number, default: 0 },
  lastLoginDate: { type: Date },

  // Counters (for achievement condition checks)
  stats: {
    pinsCreated: { type: Number, default: 0 },
    postsCreated: { type: Number, default: 0 },
    reviewsCreated: { type: Number, default: 0 },
    checkIns: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    commentsReceived: { type: Number, default: 0 },
    followersGained: { type: Number, default: 0 },
    eventsAttended: { type: Number, default: 0 },
    uniquePlacesVisited: { type: Number, default: 0 },
    dailyChallengesCompleted: { type: Number, default: 0 },
  },

  // Earned achievements (references + timestamps)
  achievements: [{
    achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
    earnedAt: { type: Date, default: Date.now },
  }],

  // Daily challenges (refreshed daily)
  dailyChallenges: [dailyChallengeSchema],
  dailyChallengesRefreshedAt: { type: Date },

  // Recent XP log (capped at 50 entries for quick display)
  xpLog: [xpLogSchema],

  // Weekly XP for leaderboard snapshots
  weeklyXP: { type: Number, default: 0 },
  monthlyXP: { type: Number, default: 0 },
  weekResetAt: { type: Date },
  monthResetAt: { type: Date },
}, { timestamps: true });

// ─── Indexes ───────────────────────────────────────────────────────────────────
userProgressSchema.index({ totalXP: -1 });                // All-time leaderboard
userProgressSchema.index({ weeklyXP: -1 });               // Weekly leaderboard
userProgressSchema.index({ monthlyXP: -1 });              // Monthly leaderboard
userProgressSchema.index({ level: -1, totalXP: -1 });     // Level + XP sort
userProgressSchema.index({ 'achievements.achievement': 1 }); // Lookup earned badges

// ─── Methods ───────────────────────────────────────────────────────────────────

/**
 * Add XP and recalculate level. Returns { leveledUp, oldLevel, newLevel }.
 */
userProgressSchema.methods.addXP = function (amount, action, meta = {}) {
  const oldLevel = this.level;

  this.totalXP += amount;
  this.weeklyXP += amount;
  this.monthlyXP += amount;

  // Recalculate level
  const { level, title } = computeLevel(this.totalXP);
  this.level = level;
  this.levelTitle = title;

  // Append to XP log (keep last 50)
  this.xpLog.push({ action, amount, meta });
  if (this.xpLog.length > 50) {
    this.xpLog = this.xpLog.slice(-50);
  }

  return {
    leveledUp: level > oldLevel,
    oldLevel,
    newLevel: level,
    newTitle: title,
    totalXP: this.totalXP,
    amount,
  };
};

/**
 * Record daily login and update streak.
 */
userProgressSchema.methods.recordLogin = function () {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (this.lastLoginDate) {
    const lastDate = this.lastLoginDate.toISOString().slice(0, 10);
    if (lastDate === today) {
      // Already logged in today
      return { alreadyLoggedIn: true, streak: this.loginStreak };
    }

    // Check if yesterday (continue streak) or gap (reset)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastDate === yesterdayStr) {
      this.loginStreak += 1;
    } else {
      this.loginStreak = 1;
    }
  } else {
    this.loginStreak = 1;
  }

  if (this.loginStreak > this.longestLoginStreak) {
    this.longestLoginStreak = this.loginStreak;
  }

  this.lastLoginDate = now;
  return { alreadyLoggedIn: false, streak: this.loginStreak };
};

export default mongoose.model('UserProgress', userProgressSchema);
