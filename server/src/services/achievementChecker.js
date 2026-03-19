import Achievement from '../models/Achievement.js';
import UserProgress from '../models/UserProgress.js';
import { getOrCreateProgress } from './xpService.js';

/**
 * Achievement Checker — evaluates whether a user has earned new achievements.
 *
 * Called after XP is awarded or stats change.
 * Compares user stats against all active achievement conditions.
 */

// ─── Condition Type Mappings ───────────────────────────────────────────────────
// Maps achievement condition.type → the stat field (or special handler) to check.
const CONDITION_MAP = {
  pin_count:              (stats) => stats.pinsCreated,
  post_count:             (stats) => stats.postsCreated,
  review_count:           (stats) => stats.reviewsCreated,
  checkin_count:          (stats) => stats.checkIns,
  likes_received_count:   (stats) => stats.likesReceived,
  comments_received_count:(stats) => stats.commentsReceived,
  followers_count:        (stats) => stats.followersGained,
  events_attended_count:  (stats) => stats.eventsAttended,
  unique_places_count:    (stats) => stats.uniquePlacesVisited,
  daily_challenges_count: (stats) => stats.dailyChallengesCompleted,
  // Streak-based (checked against progress directly, not stats)
  login_streak:           null,
  longest_login_streak:   null,
  // Level-based
  level_reached:          null,
  // Total XP
  total_xp:               null,
};

/**
 * Check and award any newly earned achievements for a user.
 *
 * @param {string} userId
 * @param {string} [triggerAction] - Optional: only check achievements relevant to this action
 * @returns {Promise<Array<{ achievement: object, earnedAt: Date }>>} Newly earned achievements
 */
export async function checkAchievements(userId, triggerAction) {
  const progress = await getOrCreateProgress(userId);

  // Get IDs of already earned achievements
  const earnedIds = new Set(
    progress.achievements.map((a) => a.achievement.toString())
  );

  // Fetch all active achievements (or filter by condition type for performance)
  const query = { isActive: true };
  if (triggerAction) {
    const relevantTypes = getRelevantConditionTypes(triggerAction);
    if (relevantTypes.length > 0) {
      query['condition.type'] = { $in: relevantTypes };
    }
  }

  const allAchievements = await Achievement.find(query).lean();

  const newlyEarned = [];

  for (const achievement of allAchievements) {
    // Skip already earned
    if (earnedIds.has(achievement._id.toString())) continue;

    // Evaluate condition
    const met = evaluateCondition(achievement.condition, progress);
    if (!met) continue;

    // Award the achievement
    const earnedAt = new Date();
    progress.achievements.push({
      achievement: achievement._id,
      earnedAt,
    });

    // Award bonus XP if any
    if (achievement.xpReward > 0) {
      progress.addXP(achievement.xpReward, 'achievement_earned', {
        achievementKey: achievement.key,
        achievementName: achievement.name,
      });
    }

    newlyEarned.push({ achievement, earnedAt });
  }

  if (newlyEarned.length > 0) {
    await progress.save();
  }

  return newlyEarned;
}

/**
 * Evaluate a single achievement condition against user progress.
 */
function evaluateCondition(condition, progress) {
  const { type, threshold } = condition;

  // Stat-based conditions
  const statGetter = CONDITION_MAP[type];
  if (typeof statGetter === 'function') {
    return statGetter(progress.stats) >= threshold;
  }

  // Special conditions (non-stat-based)
  switch (type) {
    case 'login_streak':
      return progress.loginStreak >= threshold;
    case 'longest_login_streak':
      return progress.longestLoginStreak >= threshold;
    case 'level_reached':
      return progress.level >= threshold;
    case 'total_xp':
      return progress.totalXP >= threshold;
    default:
      // Unknown condition type — don't award
      return false;
  }
}

/**
 * Map an action to the condition types it could trigger.
 * This avoids checking all achievements on every action.
 */
function getRelevantConditionTypes(action) {
  const actionToConditions = {
    pin_create:        ['pin_count', 'total_xp', 'level_reached'],
    post_create:       ['post_count', 'total_xp', 'level_reached'],
    review_create:     ['review_count', 'total_xp', 'level_reached'],
    check_in:          ['checkin_count', 'unique_places_count', 'total_xp', 'level_reached'],
    like_received:     ['likes_received_count', 'total_xp'],
    comment_received:  ['comments_received_count', 'total_xp'],
    follow_gained:     ['followers_count', 'total_xp'],
    event_attend:      ['events_attended_count', 'total_xp', 'level_reached'],
    daily_login:       ['login_streak', 'longest_login_streak', 'total_xp', 'level_reached'],
    daily_challenge:   ['daily_challenges_count', 'total_xp'],
    achievement_earned:[], // No recursive checks
  };

  return actionToConditions[action] || Object.keys(CONDITION_MAP);
}

/**
 * Seed the database with default achievements.
 * Idempotent — skips achievements that already exist by key.
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function seedAchievements() {
  const defaults = getDefaultAchievements();
  let created = 0;
  let skipped = 0;

  for (const def of defaults) {
    const exists = await Achievement.findOne({ key: def.key });
    if (exists) {
      skipped++;
      continue;
    }
    await Achievement.create(def);
    created++;
  }

  return { created, skipped };
}

/**
 * Default achievement definitions.
 */
function getDefaultAchievements() {
  return [
    // ─── First Steps ─────────────────────────────────────────────────
    { key: 'first_pin',        name: 'First Pin',          description: 'Create your first pin',               icon: '📍', category: 'first_steps', condition: { type: 'pin_count', threshold: 1 },             xpReward: 25,  tier: 'bronze',   sortOrder: 1 },
    { key: 'first_post',       name: 'First Post',         description: 'Share your first post',               icon: '📝', category: 'first_steps', condition: { type: 'post_count', threshold: 1 },            xpReward: 25,  tier: 'bronze',   sortOrder: 2 },
    { key: 'first_review',     name: 'First Review',       description: 'Write your first review',             icon: '⭐', category: 'first_steps', condition: { type: 'review_count', threshold: 1 },          xpReward: 25,  tier: 'bronze',   sortOrder: 3 },
    { key: 'first_checkin',    name: 'First Check-in',     description: 'Check in at a location for the first time', icon: '✅', category: 'first_steps', condition: { type: 'checkin_count', threshold: 1 },    xpReward: 25,  tier: 'bronze',   sortOrder: 4 },
    { key: 'first_follower',   name: 'First Follower',     description: 'Get your first follower',             icon: '👤', category: 'first_steps', condition: { type: 'followers_count', threshold: 1 },       xpReward: 25,  tier: 'bronze',   sortOrder: 5 },

    // ─── Social ──────────────────────────────────────────────────────
    { key: 'social_10',        name: 'Social Starter',     description: 'Gain 10 followers',                   icon: '👥', category: 'social', condition: { type: 'followers_count', threshold: 10 },          xpReward: 50,  tier: 'bronze',   sortOrder: 10 },
    { key: 'social_50',        name: 'Social Butterfly',   description: 'Gain 50 followers',                   icon: '🦋', category: 'social', condition: { type: 'followers_count', threshold: 50 },          xpReward: 100, tier: 'silver',   sortOrder: 11 },
    { key: 'social_100',       name: 'Influencer',         description: 'Gain 100 followers',                  icon: '🌟', category: 'social', condition: { type: 'followers_count', threshold: 100 },         xpReward: 250, tier: 'gold',     sortOrder: 12 },
    { key: 'social_500',       name: 'Community Leader',   description: 'Gain 500 followers',                  icon: '👑', category: 'social', condition: { type: 'followers_count', threshold: 500 },         xpReward: 500, tier: 'platinum', sortOrder: 13 },
    { key: 'liked_10',         name: 'Appreciated',        description: 'Receive 10 likes',                    icon: '❤️', category: 'social', condition: { type: 'likes_received_count', threshold: 10 },     xpReward: 30,  tier: 'bronze',   sortOrder: 14 },
    { key: 'liked_100',        name: 'Popular',            description: 'Receive 100 likes',                   icon: '💖', category: 'social', condition: { type: 'likes_received_count', threshold: 100 },    xpReward: 100, tier: 'silver',   sortOrder: 15 },
    { key: 'liked_500',        name: 'Beloved',            description: 'Receive 500 likes',                   icon: '💎', category: 'social', condition: { type: 'likes_received_count', threshold: 500 },    xpReward: 250, tier: 'gold',     sortOrder: 16 },

    // ─── Content ─────────────────────────────────────────────────────
    { key: 'pins_5',           name: 'Pin Collector',      description: 'Create 5 pins',                       icon: '📌', category: 'content', condition: { type: 'pin_count', threshold: 5 },                xpReward: 50,  tier: 'bronze',   sortOrder: 20 },
    { key: 'pins_25',          name: 'Pin Master',         description: 'Create 25 pins',                      icon: '🗺️', category: 'content', condition: { type: 'pin_count', threshold: 25 },               xpReward: 150, tier: 'silver',   sortOrder: 21 },
    { key: 'pins_100',         name: 'Cartographer',       description: 'Create 100 pins',                     icon: '🌍', category: 'content', condition: { type: 'pin_count', threshold: 100 },              xpReward: 400, tier: 'gold',     sortOrder: 22 },
    { key: 'posts_10',         name: 'Storyteller',        description: 'Create 10 posts',                     icon: '📖', category: 'content', condition: { type: 'post_count', threshold: 10 },              xpReward: 50,  tier: 'bronze',   sortOrder: 23 },
    { key: 'posts_50',         name: 'Prolific Writer',    description: 'Create 50 posts',                     icon: '✍️', category: 'content', condition: { type: 'post_count', threshold: 50 },              xpReward: 200, tier: 'silver',   sortOrder: 24 },
    { key: 'reviews_5',        name: 'Critic',             description: 'Write 5 reviews',                     icon: '🎯', category: 'content', condition: { type: 'review_count', threshold: 5 },             xpReward: 50,  tier: 'bronze',   sortOrder: 25 },
    { key: 'reviews_25',       name: 'Connoisseur',        description: 'Write 25 reviews',                    icon: '🏅', category: 'content', condition: { type: 'review_count', threshold: 25 },            xpReward: 200, tier: 'silver',   sortOrder: 26 },

    // ─── Explorer ────────────────────────────────────────────────────
    { key: 'checkin_5',        name: 'Frequent Visitor',   description: 'Check in 5 times',                    icon: '🚶', category: 'explorer', condition: { type: 'checkin_count', threshold: 5 },            xpReward: 50,  tier: 'bronze',   sortOrder: 30 },
    { key: 'checkin_25',       name: 'Explorer',           description: 'Check in 25 times',                   icon: '🧭', category: 'explorer', condition: { type: 'checkin_count', threshold: 25 },           xpReward: 150, tier: 'silver',   sortOrder: 31 },
    { key: 'checkin_100',      name: 'Globetrotter',       description: 'Check in 100 times',                  icon: '✈️', category: 'explorer', condition: { type: 'checkin_count', threshold: 100 },          xpReward: 400, tier: 'gold',     sortOrder: 32 },
    { key: 'events_3',         name: 'Social Goer',        description: 'Attend 3 events',                     icon: '🎉', category: 'explorer', condition: { type: 'events_attended_count', threshold: 3 },    xpReward: 50,  tier: 'bronze',   sortOrder: 33 },
    { key: 'events_10',        name: 'Event Enthusiast',   description: 'Attend 10 events',                    icon: '🎊', category: 'explorer', condition: { type: 'events_attended_count', threshold: 10 },   xpReward: 150, tier: 'silver',   sortOrder: 34 },

    // ─── Streak ──────────────────────────────────────────────────────
    { key: 'streak_3',         name: 'Getting Started',    description: 'Login 3 days in a row',               icon: '🔥', category: 'streak', condition: { type: 'login_streak', threshold: 3 },              xpReward: 30,  tier: 'bronze',   sortOrder: 40 },
    { key: 'streak_7',         name: 'Week Warrior',       description: 'Login 7 days in a row',               icon: '💪', category: 'streak', condition: { type: 'login_streak', threshold: 7 },              xpReward: 75,  tier: 'silver',   sortOrder: 41 },
    { key: 'streak_30',        name: 'Monthly Master',     description: 'Login 30 days in a row',              icon: '🏆', category: 'streak', condition: { type: 'login_streak', threshold: 30 },             xpReward: 300, tier: 'gold',     sortOrder: 42 },
    { key: 'streak_100',       name: 'Unstoppable',        description: 'Login 100 days in a row',             icon: '⚡', category: 'streak', condition: { type: 'longest_login_streak', threshold: 100 },    xpReward: 1000,tier: 'diamond',  sortOrder: 43 },

    // ─── Special ─────────────────────────────────────────────────────
    { key: 'level_3',          name: 'Rising Star',        description: 'Reach level 3 (Contributor)',         icon: '⭐', category: 'special', condition: { type: 'level_reached', threshold: 3 },             xpReward: 100, tier: 'silver',   sortOrder: 50 },
    { key: 'level_5',          name: 'Champion',           description: 'Reach level 5 (Champion)',            icon: '🏅', category: 'special', condition: { type: 'level_reached', threshold: 5 },             xpReward: 500, tier: 'gold',     sortOrder: 51 },
    { key: 'level_6',          name: 'Legendary',          description: 'Reach the maximum level',             icon: '💎', category: 'special', condition: { type: 'level_reached', threshold: 6 },             xpReward: 1000,tier: 'diamond',  sortOrder: 52 },
    { key: 'xp_1000',          name: 'XP Hunter',          description: 'Earn 1000 total XP',                  icon: '🎮', category: 'special', condition: { type: 'total_xp', threshold: 1000 },              xpReward: 50,  tier: 'bronze',   sortOrder: 53 },
    { key: 'xp_10000',         name: 'XP Legend',          description: 'Earn 10000 total XP',                 icon: '🌟', category: 'special', condition: { type: 'total_xp', threshold: 10000 },             xpReward: 250, tier: 'gold',     sortOrder: 54 },
    { key: 'challenges_10',    name: 'Challenge Seeker',   description: 'Complete 10 daily challenges',        icon: '🎯', category: 'special', condition: { type: 'daily_challenges_count', threshold: 10 },  xpReward: 100, tier: 'silver',   sortOrder: 55 },
    { key: 'challenges_50',    name: 'Challenge Master',   description: 'Complete 50 daily challenges',        icon: '🏆', category: 'special', condition: { type: 'daily_challenges_count', threshold: 50 },  xpReward: 300, tier: 'gold',     sortOrder: 56 },
  ];
}
