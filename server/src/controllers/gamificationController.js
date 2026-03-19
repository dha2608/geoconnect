import mongoose from 'mongoose';
import UserProgress, { LEVELS, computeLevel } from '../models/UserProgress.js';
import Achievement from '../models/Achievement.js';
import { getOrCreateProgress, recordDailyLogin, refreshDailyChallenges } from '../services/xpService.js';
import { checkAchievements, seedAchievements } from '../services/achievementChecker.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { ok, paginated, message } from '../utils/response.js';

// ─── Validation Helpers ─────────────────────────────────────────────────────────

const VALID_PERIODS = ['weekly', 'monthly', 'alltime'];
const VALID_SCOPES = ['global', 'friends'];
const VALID_CATEGORIES = ['exploration', 'social', 'content', 'streak', 'special'];

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest(`Invalid ${label}`);
  }
}

// ─── User Progress ─────────────────────────────────────────────────────────────

/**
 * GET /api/gamification/me
 * Get the current user's gamification progress.
 */
export const getMyProgress = asyncHandler(async (req, res) => {
  const progress = await getOrCreateProgress(req.user._id);
  await progress.populate('achievements.achievement');

  const levelInfo = computeLevel(progress.totalXP);

  return ok(res, {
    totalXP: progress.totalXP,
    level: progress.level,
    levelTitle: progress.levelTitle,
    levelInfo,
    loginStreak: progress.loginStreak,
    longestLoginStreak: progress.longestLoginStreak,
    stats: progress.stats,
    achievements: progress.achievements,
    dailyChallenges: progress.dailyChallenges,
    dailyChallengesRefreshedAt: progress.dailyChallengesRefreshedAt,
    xpLog: progress.xpLog.slice(-20), // Last 20 entries
    weeklyXP: progress.weeklyXP,
    monthlyXP: progress.monthlyXP,
  });
});

/**
 * GET /api/gamification/users/:userId
 * Get another user's public gamification profile.
 */
export const getUserProgress = asyncHandler(async (req, res) => {
  validateObjectId(req.params.userId, 'userId');

  const progress = await UserProgress.findOne({ user: req.params.userId })
    .populate('achievements.achievement')
    .lean();

  if (!progress) {
    return ok(res, {
      totalXP: 0,
      level: 1,
      levelTitle: 'Newcomer',
      achievements: [],
      stats: {},
    });
  }

  const levelInfo = computeLevel(progress.totalXP);

  // Public view — omit xpLog and daily challenges
  return ok(res, {
    totalXP: progress.totalXP,
    level: progress.level,
    levelTitle: progress.levelTitle,
    levelInfo,
    loginStreak: progress.loginStreak,
    stats: progress.stats,
    achievements: progress.achievements,
    weeklyXP: progress.weeklyXP,
    monthlyXP: progress.monthlyXP,
  });
});

// ─── Daily Login ───────────────────────────────────────────────────────────────

/**
 * POST /api/gamification/daily-login
 * Record daily login and award streak-based XP.
 */
export const dailyLogin = asyncHandler(async (req, res) => {
  const { loginResult, xpResult, progress } = await recordDailyLogin(req.user._id);

  // Check achievements after login (streak-related)
  let newAchievements = [];
  if (!loginResult.alreadyLoggedIn) {
    newAchievements = await checkAchievements(req.user._id, 'daily_login');
  }

  return ok(res, {
    alreadyLoggedIn: loginResult.alreadyLoggedIn,
    streak: loginResult.streak,
    xpAwarded: xpResult ? xpResult.amount : 0,
    xpResult,
    newAchievements: newAchievements.map((a) => a.achievement),
    totalXP: progress.totalXP,
    level: progress.level,
    levelTitle: progress.levelTitle,
  });
});

// ─── Daily Challenges ──────────────────────────────────────────────────────────

/**
 * GET /api/gamification/daily-challenges
 * Get today's daily challenges (refreshes if needed).
 */
export const getDailyChallenges = asyncHandler(async (req, res) => {
  const progress = await refreshDailyChallenges(req.user._id);

  return ok(res, {
    challenges: progress.dailyChallenges,
    refreshedAt: progress.dailyChallengesRefreshedAt,
  });
});

// ─── Achievements ──────────────────────────────────────────────────────────────

/**
 * GET /api/gamification/achievements
 * List all available achievements with user's earned status.
 */
export const getAllAchievements = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const query = { isActive: true };
  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw AppError.badRequest(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    query.category = category;
  }

  // Don't show hidden achievements unless user already earned them
  const allAchievements = await Achievement.find(query)
    .sort({ category: 1, sortOrder: 1 })
    .lean();

  // If authenticated, mark which ones the user has earned
  let earnedMap = {};
  if (req.user) {
    const progress = await UserProgress.findOne({ user: req.user._id })
      .select('achievements')
      .lean();

    if (progress) {
      for (const earned of progress.achievements) {
        earnedMap[earned.achievement.toString()] = earned.earnedAt;
      }
    }
  }

  const result = allAchievements
    .filter((a) => !a.isHidden || earnedMap[a._id.toString()])
    .map((a) => ({
      ...a,
      earned: !!earnedMap[a._id.toString()],
      earnedAt: earnedMap[a._id.toString()] || null,
    }));

  return ok(res, result);
});

// ─── Leaderboard ───────────────────────────────────────────────────────────────

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard by period (weekly/monthly/alltime).
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { period = 'weekly', scope = 'global' } = req.query;
  const { page, limit, skip } = req.pagination;

  if (!VALID_PERIODS.includes(period)) {
    throw AppError.badRequest(`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`);
  }
  if (!VALID_SCOPES.includes(scope)) {
    throw AppError.badRequest(`Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}`);
  }

  // Choose sort field based on period
  const sortField = {
    weekly: 'weeklyXP',
    monthly: 'monthlyXP',
    alltime: 'totalXP',
  }[period] || 'weeklyXP';

  const pipeline = [
    { $match: { [sortField]: { $gt: 0 } } },
    { $sort: { [sortField]: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [{ $project: { name: 1, avatar: 1 } }],
      },
    },
    { $addFields: { userInfo: { $arrayElemAt: ['$userInfo', 0] } } },
    {
      $project: {
        user: 1,
        userInfo: 1,
        totalXP: 1,
        weeklyXP: 1,
        monthlyXP: 1,
        level: 1,
        levelTitle: 1,
      },
    },
  ];

  // If scope is 'friends', filter by the user's following list
  if (scope === 'friends' && req.user) {
    const friendIds = [...(req.user.following || []), req.user._id];
    pipeline[0].$match.user = { $in: friendIds };
  }

  const [entries, totalResult] = await Promise.all([
    UserProgress.aggregate(pipeline),
    UserProgress.countDocuments({ [sortField]: { $gt: 0 } }),
  ]);

  // Add rank numbers
  const ranked = entries.map((entry, idx) => ({
    rank: skip + idx + 1,
    ...entry,
    xp: entry[sortField],
  }));

  // Get current user's rank
  let myRank = null;
  if (req.user) {
    const myProgress = await UserProgress.findOne({ user: req.user._id }).lean();
    if (myProgress && myProgress[sortField] > 0) {
      const ahead = await UserProgress.countDocuments({
        [sortField]: { $gt: myProgress[sortField] },
      });
      myRank = {
        rank: ahead + 1,
        xp: myProgress[sortField],
        level: myProgress.level,
        levelTitle: myProgress.levelTitle,
      };
    }
  }

  return paginated(res, { rankings: ranked, myRank }, { page, limit, total: totalResult });
});

// ─── Levels ────────────────────────────────────────────────────────────────────

/**
 * GET /api/gamification/levels
 * Get all level definitions.
 */
export const getLevels = asyncHandler(async (req, res) => {
  return ok(res, LEVELS);
});

// ─── XP History ────────────────────────────────────────────────────────────────

/**
 * GET /api/gamification/xp-history
 * Get the current user's recent XP log.
 */
export const getXPHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 50);

  const progress = await UserProgress.findOne({ user: req.user._id })
    .select('xpLog')
    .lean();

  if (!progress) return ok(res, []);

  // Return most recent first, capped by limit
  const log = (progress.xpLog || []).reverse().slice(0, limit);
  return ok(res, log);
});

// ─── Admin: Seed Achievements ──────────────────────────────────────────────────

/**
 * POST /api/gamification/seed
 * Seed default achievements (admin only).
 */
export const seed = asyncHandler(async (req, res) => {
  const result = await seedAchievements();
  return message(res, `Seeded achievements: ${result.created} created, ${result.skipped} skipped`);
});
