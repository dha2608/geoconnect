import mongoose from 'mongoose';
import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';
import { sendAccountDeletedEmail } from '../utils/email.js';
import { notifyEmail } from '../utils/notifyWithEmail.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, message } from '../utils/response.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -googleId -githubId -refreshTokenHash -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -twoFactorSecret -twoFactorBackupCodes')
    .lean();
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);
  return ok(res, {
    ...user,
    followersCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    followers: undefined,
    following: undefined,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  const allowedFields = ['name', 'bio', 'isLocationPublic'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return ok(res, user.toPublicJSON());
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('No file uploaded');

  const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/avatars');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: result.secure_url },
    { new: true },
  );
  return ok(res, { avatar: user.avatar });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('name avatar bio followers following createdAt');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);
  return ok(res, user);
});

export const followUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    throw AppError.badRequest('Cannot follow yourself');
  }

  const target = await User.findById(req.params.id);
  if (!target) throw new AppError(ERR.USER_NOT_FOUND);

  if (target.followers.includes(req.user._id)) {
    throw AppError.badRequest('Already following');
  }

  await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id } });
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id } });

  // Notify the followed user
  await createNotification(req, {
    recipientId: req.params.id,
    senderId: req.user._id,
    type: 'follow',
    data: {},
  });

  // Fire-and-forget email notification
  notifyEmail(req.params.id, 'follow', { followerName: req.user.name });

  return message(res, 'Followed successfully');
});

export const unfollowUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
  await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });

  return message(res, 'Unfollowed successfully');
});

export const getNearbyUsers = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  if (!lat || !lng) throw AppError.badRequest('lat and lng required');

  // Get blocked users to exclude them
  const currentUser = await User.findById(req.user._id).select('blockedUsers');
  const blockedIds = currentUser?.blockedUsers || [];

  const users = await User.find({
    _id: { $ne: req.user._id, $nin: blockedIds },
    blockedUsers: { $nin: [req.user._id] },
    isLocationPublic: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) * 1000,
      },
    },
  }).select('name avatar bio location isLiveSharing').limit(50).lean();

  return ok(res, users);
});

export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) throw AppError.badRequest('lat and lng required');

  const user = await User.findByIdAndUpdate(req.user._id, {
    location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    lastLocationUpdate: new Date(),
  }, { new: true });

  return ok(res, { location: user.location });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

  // Get blocked users to exclude from search
  const currentUser = await User.findById(req.user._id).select('blockedUsers');
  const blockedIds = currentUser?.blockedUsers || [];
  const blockedFilter = { _id: { $nin: blockedIds }, blockedUsers: { $nin: [req.user._id] } };

  let users;
  if (q.length >= 3) {
    // Use MongoDB text index for relevance-ranked search on name + bio
    users = await User.find(
      { ...blockedFilter, $text: { $search: q } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .select('name avatar bio followers following')
      .limit(20)
      .lean();
  } else {
    // Fallback to regex for very short queries — also searches email
    users = await User.find({
      ...blockedFilter,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name avatar bio followers following').limit(20).lean();
  }

  return ok(res, users);
});

export const getFollowers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('followers').lean();
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);
  const followers = await User.find({ _id: { $in: user.followers } })
    .select('name avatar bio')
    .lean();
  return ok(res, followers);
});

export const getFollowing = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('following').lean();
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);
  const following = await User.find({ _id: { $in: user.following } })
    .select('name avatar bio')
    .lean();
  return ok(res, following);
});

// GET /api/users/me/settings
export const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('settings');
  return ok(res, { settings: user.settings || getDefaultSettings() });
});

// PUT /api/users/me/settings
export const updateSettings = asyncHandler(async (req, res) => {
  const allowedFields = ['privacy', 'notifications', 'appearance'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[`settings.${field}`] = req.body[field];
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('settings');
  return ok(res, { settings: user.settings });
});

function getDefaultSettings() {
  return {
    privacy: { shareLocation: true, nearbyDiscovery: true, publicProfile: true },
    notifications: { push: true, email: false, newFollower: true, nearbyEvent: true },
    appearance: { mapStyle: 'dark', distanceUnit: 'km' },
  };
}

// POST /api/users/:id/block
export const blockUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user._id.toString()) {
    throw AppError.badRequest('Cannot block yourself');
  }

  const target = await User.findById(targetId).select('_id').lean();
  if (!target) throw new AppError(ERR.USER_NOT_FOUND);

  // Atomic: add to blockedUsers, remove from following/followers
  const [updatedUser] = await Promise.all([
    User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { blockedUsers: targetId },
        $pull: { following: targetId, followers: targetId },
      },
      { new: true },
    ).select('blockedUsers'),
    User.findByIdAndUpdate(targetId, {
      $pull: { following: req.user._id, followers: req.user._id },
    }),
  ]);

  return ok(res, { message: 'User blocked', blockedUsers: updatedUser.blockedUsers });
});

// DELETE /api/users/:id/block
export const unblockUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { blockedUsers: targetId } },
    { new: true },
  ).select('blockedUsers');

  return ok(res, { message: 'User unblocked', blockedUsers: user.blockedUsers });
});

// GET /api/users/me/blocked
export const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'name avatar bio');
  return ok(res, user.blockedUsers || []);
});

// GET /api/users/:id/stats — activity/content counts
export const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId).select('followers following').lean();
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  const [Pin, Post, Event, Review] = await Promise.all([
    import('../models/Pin.js').then(m => m.default),
    import('../models/Post.js').then(m => m.default),
    import('../models/Event.js').then(m => m.default),
    import('../models/Review.js').then(m => m.default),
  ]);

  const [pinCount, postCount, eventCount, reviewCount] = await Promise.all([
    Pin.countDocuments({ createdBy: userId }),
    Post.countDocuments({ author: userId }),
    Event.countDocuments({ organizer: userId }),
    Review.countDocuments({ user: userId }),
  ]);

  return ok(res, {
    pins: pinCount,
    posts: postCount,
    events: eventCount,
    reviews: reviewCount,
    followers: user.followers?.length || 0,
    following: user.following?.length || 0,
  });
});

// DELETE /api/users/me — permanently delete account and cascade related data
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError(ERR.USER_NOT_FOUND);

  // OAuth-only users don't have a password — skip check for them
  if (user.password) {
    if (!password) {
      throw AppError.badRequest('Password is required to delete your account');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw AppError.badRequest('Incorrect password');
    }
  }

  const userId = user._id;
  const { email, name } = user;

  // Lazy-import models to avoid circular dependency issues
  const [Pin, Post, Event, Review, Message, Conversation, Notification, Comment] = await Promise.all([
    import('../models/Pin.js').then(m => m.default),
    import('../models/Post.js').then(m => m.default),
    import('../models/Event.js').then(m => m.default),
    import('../models/Review.js').then(m => m.default),
    import('../models/Message.js').then(m => m.default),
    import('../models/Conversation.js').then(m => m.default),
    import('../models/Notification.js').then(m => m.default),
    import('../models/Comment.js').then(m => m.default),
  ]);

  // Run all cascade deletes inside a transaction for atomicity
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Get user's post IDs so we can delete their comments too
      const userPostIds = await Post.find({ author: userId }, '_id').session(session);
      const postIds = userPostIds.map(p => p._id);

      await Promise.all([
        // Delete user-created content
        Pin.deleteMany({ creator: userId }).session(session),
        Post.deleteMany({ author: userId }).session(session),
        Event.deleteMany({ creator: userId }).session(session),
        Review.deleteMany({ user: userId }).session(session),
        Message.deleteMany({ sender: userId }).session(session),
        Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }).session(session),
        // Delete comments by user + comments on user's posts
        Comment.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }).session(session),
        // Remove from conversations
        Conversation.updateMany(
          { participants: userId },
          { $pull: { participants: userId } },
        ).session(session),
        // Remove from followers/following
        User.updateMany(
          { $or: [{ followers: userId }, { following: userId }] },
          { $pull: { followers: userId, following: userId } },
        ).session(session),
        // Remove from saved pins lists
        User.updateMany(
          { savedPins: userId },
          { $pull: { savedPins: userId } },
        ).session(session),
        // Delete the user
        User.findByIdAndDelete(userId).session(session),
      ]);
    });
  } finally {
    await session.endSession();
  }

  // Clear auth cookie
  res.clearCookie('refreshToken');

  // Send confirmation email (best-effort)
  sendAccountDeletedEmail(email, name).catch(() => {});

  return message(res, 'Account deleted successfully');
});
