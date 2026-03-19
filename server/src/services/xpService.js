import UserProgress from '../models/UserProgress.js';

/**
 * XP Service — central place for awarding XP and recording daily logins.
 *
 * Called from controllers after successful actions (pin create, check-in, etc.).
 * Returns { xpResult, progress } so the caller can include XP info in responses.
 */

// ─── XP Amounts ────────────────────────────────────────────────────────────────
export const XP_VALUES = Object.freeze({
  PIN_CREATE:       15,
  POST_CREATE:      10,
  CHECK_IN:         20,
  LIKE_RECEIVED:     2,
  COMMENT_RECEIVED:  3,
  REVIEW_CREATE:    25,
  FOLLOW_GAINED:     5,
  DAILY_LOGIN:      10,
  EVENT_ATTEND:     15,
  DAILY_CHALLENGE:  10, // Base; actual value comes from challenge definition
});

// ─── Streak Multipliers ────────────────────────────────────────────────────────
export const STREAK_MULTIPLIERS = [
  { minDays: 30, multiplier: 2.0 },
  { minDays: 7,  multiplier: 1.5 },
];

/**
 * Get or create a UserProgress document for the given user.
 */
export async function getOrCreateProgress(userId) {
  let progress = await UserProgress.findOne({ user: userId });
  if (!progress) {
    progress = await UserProgress.create({ user: userId });
  }
  return progress;
}

/**
 * Award XP for a specific action.
 *
 * @param {string} userId - The user performing the action
 * @param {string} action - One of the XP_VALUES keys (lowercase): 'pin_create', 'check_in', etc.
 * @param {object} [meta={}] - Extra context (pinId, postId, etc.)
 * @param {number} [overrideAmount] - Override the default XP amount
 * @returns {Promise<{ xpResult: object, progress: object }>}
 */
export async function awardXP(userId, action, meta = {}, overrideAmount) {
  const progress = await getOrCreateProgress(userId);

  const amount = overrideAmount ?? XP_VALUES[action.toUpperCase()] ?? 0;
  if (amount <= 0) return { xpResult: null, progress };

  const xpResult = progress.addXP(amount, action, meta);

  // Update stat counters based on action
  incrementStat(progress, action);

  await progress.save();

  return { xpResult, progress };
}

/**
 * Record a daily login, award XP with streak bonuses.
 *
 * @param {string} userId
 * @returns {Promise<{ loginResult: object, xpResult: object | null, progress: object }>}
 */
export async function recordDailyLogin(userId) {
  const progress = await getOrCreateProgress(userId);
  const loginResult = progress.recordLogin();

  if (loginResult.alreadyLoggedIn) {
    return { loginResult, xpResult: null, progress };
  }

  // Calculate streak bonus
  let baseXP = XP_VALUES.DAILY_LOGIN;
  let multiplier = 1;
  for (const { minDays, multiplier: mult } of STREAK_MULTIPLIERS) {
    if (loginResult.streak >= minDays) {
      multiplier = mult;
      break;
    }
  }

  const totalLoginXP = Math.round(baseXP * multiplier);
  const xpResult = progress.addXP(totalLoginXP, 'daily_login', {
    streak: loginResult.streak,
    multiplier,
  });

  await progress.save();

  return { loginResult, xpResult, progress };
}

/**
 * Refresh daily challenges (called on login or when fetching challenges).
 *
 * @param {string} userId
 * @returns {Promise<object>} Updated progress
 */
export async function refreshDailyChallenges(userId) {
  const progress = await getOrCreateProgress(userId);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Check if already refreshed today
  if (progress.dailyChallengesRefreshedAt) {
    const refreshedDate = progress.dailyChallengesRefreshedAt.toISOString().slice(0, 10);
    if (refreshedDate === today) return progress;
  }

  // Generate 3 random daily challenges
  progress.dailyChallenges = generateDailyChallenges();
  progress.dailyChallengesRefreshedAt = now;
  await progress.save();

  return progress;
}

/**
 * Increment progress on a daily challenge.
 *
 * @param {string} userId
 * @param {string} challengeKey - e.g. 'create_pin', 'checkin', 'like'
 * @returns {Promise<{ completed: boolean, challenge: object | null, xpAwarded: number }>}
 */
export async function incrementDailyChallenge(userId, challengeKey) {
  const progress = await getOrCreateProgress(userId);

  const challenge = progress.dailyChallenges.find(
    (c) => c.key === challengeKey && !c.completed
  );

  if (!challenge) return { completed: false, challenge: null, xpAwarded: 0 };

  challenge.progress += 1;

  if (challenge.progress >= challenge.target) {
    challenge.completed = true;
    // Award challenge XP
    const xpResult = progress.addXP(challenge.xpReward, 'daily_challenge', {
      challengeKey,
    });
    progress.stats.dailyChallengesCompleted += 1;
    await progress.save();
    return { completed: true, challenge, xpAwarded: challenge.xpReward, xpResult };
  }

  await progress.save();
  return { completed: false, challenge, xpAwarded: 0 };
}

/**
 * Reset weekly/monthly XP counters (call from a cron job or on-demand).
 */
export async function resetPeriodicXP(period) {
  const now = new Date();
  const update = {};

  if (period === 'weekly') {
    update.weeklyXP = 0;
    update.weekResetAt = now;
  } else if (period === 'monthly') {
    update.monthlyXP = 0;
    update.monthResetAt = now;
  }

  await UserProgress.updateMany({}, { $set: update });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Increment the appropriate stat counter on the progress document.
 */
function incrementStat(progress, action) {
  const statMap = {
    pin_create: 'pinsCreated',
    post_create: 'postsCreated',
    review_create: 'reviewsCreated',
    check_in: 'checkIns',
    like_received: 'likesReceived',
    comment_received: 'commentsReceived',
    follow_gained: 'followersGained',
    event_attend: 'eventsAttended',
  };

  const statKey = statMap[action.toLowerCase()];
  if (statKey && progress.stats[statKey] !== undefined) {
    progress.stats[statKey] += 1;
  }
}

/**
 * Generate 3 random daily challenges from the pool.
 */
function generateDailyChallenges() {
  const pool = [
    { key: 'create_pin',    description: 'Create a new pin',             xpReward: 20, target: 1 },
    { key: 'create_post',   description: 'Share a new post',             xpReward: 15, target: 1 },
    { key: 'check_in',      description: 'Check in at a location',       xpReward: 20, target: 1 },
    { key: 'check_in_2',    description: 'Check in at 2 locations',      xpReward: 35, target: 2 },
    { key: 'like_3',        description: 'Like 3 pins or posts',         xpReward: 10, target: 3 },
    { key: 'like_5',        description: 'Like 5 pins or posts',         xpReward: 20, target: 5 },
    { key: 'comment_post',  description: 'Leave 2 comments',             xpReward: 15, target: 2 },
    { key: 'write_review',  description: 'Write a review',               xpReward: 30, target: 1 },
    { key: 'follow_user',   description: 'Follow a new user',            xpReward: 10, target: 1 },
    { key: 'explore_3',     description: 'Visit 3 different pin pages',  xpReward: 15, target: 3 },
    { key: 'create_pin_2',  description: 'Create 2 pins',                xpReward: 35, target: 2 },
    { key: 'attend_event',  description: 'RSVP to an event',             xpReward: 20, target: 1 },
  ];

  // Shuffle and pick 3
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((c) => ({
    ...c,
    progress: 0,
    completed: false,
  }));
}
