import mongoose from 'mongoose';

/**
 * Achievement / Badge definition.
 *
 * Each document is a badge template (e.g. "First Pin", "Explorer Level 3").
 * User progress toward achievements is tracked in UserProgress.
 */
const achievementSchema = new mongoose.Schema({
  // Unique machine-readable key (e.g. 'first_pin', 'social_butterfly_3')
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_]+$/,
  },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  icon: { type: String, default: '🏆' }, // emoji or image URL
  category: {
    type: String,
    required: true,
    enum: [
      'first_steps',  // Onboarding milestones
      'social',       // Follow, message, community
      'content',      // Pins, posts, reviews
      'explorer',     // Check-ins, distance, unique places
      'streak',       // Login / activity streaks
      'special',      // Events, seasonal, rare
    ],
  },
  // What the user needs to accomplish
  condition: {
    type: { type: String, required: true }, // e.g. 'pin_count', 'checkin_count', 'login_streak'
    threshold: { type: Number, required: true, min: 1 }, // e.g. 10 pins
  },
  // Rewards
  xpReward: { type: Number, default: 0, min: 0 },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze',
  },
  // Ordering & visibility
  sortOrder: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false }, // Secret achievements
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

achievementSchema.index({ category: 1, sortOrder: 1 });
achievementSchema.index({ 'condition.type': 1 });
achievementSchema.index({ isActive: 1 });

export default mongoose.model('Achievement', achievementSchema);
