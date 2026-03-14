import mongoose from 'mongoose';
import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';
import { sendAccountDeletedEmail } from '../utils/email.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'name avatar')
      .populate('following', 'name avatar');
    res.json(user.toPublicJSON());
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['name', 'bio', 'isLocationPublic'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json(user.toPublicJSON());
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/avatars');
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );
    res.json({ avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar bio followers following createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const followUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    
    if (target.followers.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already following' });
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
    
    res.json({ message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getNearbyUsers = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

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
    }).select('name avatar bio location isLiveSharing').limit(50);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });
    
    const user = await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      lastLocationUpdate: new Date(),
    }, { new: true });
    
    res.json({ location: user.location });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters' });

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
        .limit(20);
    } else {
      // Fallback to regex for very short queries — also searches email
      users = await User.find({
        ...blockedFilter,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      }).select('name avatar bio followers following').limit(20);
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name avatar bio');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.followers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name avatar bio');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.following);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/me/settings
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    res.json({ settings: user.settings || getDefaultSettings() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

// PUT /api/users/me/settings
export const updateSettings = async (req, res) => {
  try {
    const allowedFields = ['privacy', 'notifications', 'appearance'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[`settings.${field}`] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('settings');
    res.json({ settings: user.settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

function getDefaultSettings() {
  return {
    privacy: { shareLocation: true, nearbyDiscovery: true, publicProfile: true },
    notifications: { push: true, email: false, newFollower: true, nearbyEvent: true },
    appearance: { mapStyle: 'dark', distanceUnit: 'km' },
  };
}

// POST /api/users/:id/block
export const blockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const user = await User.findById(req.user._id);

    // Add to blocked list if not already blocked
    if (!user.blockedUsers.includes(targetId)) {
      user.blockedUsers.push(targetId);
    }

    // Also unfollow in both directions
    user.following = user.following.filter(id => id.toString() !== targetId);
    user.followers = user.followers.filter(id => id.toString() !== targetId);
    await user.save();

    // Remove from target's followers/following too
    target.following = target.following.filter(id => id.toString() !== req.user._id.toString());
    target.followers = target.followers.filter(id => id.toString() !== req.user._id.toString());
    await target.save();

    res.json({ message: 'User blocked', blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/users/:id/block
export const unblockUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: targetId } },
      { new: true },
    ).select('blockedUsers');

    res.json({ message: 'User unblocked', blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/me/blocked
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'name avatar bio');
    res.json(user.blockedUsers || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/users/:id/stats — activity/content counts
export const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

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

    res.json({
      pins: pinCount,
      posts: postCount,
      events: eventCount,
      reviews: reviewCount,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/users/me — permanently delete account and cascade related data
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // OAuth-only users don't have a password — skip check for them
    if (user.password) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to delete your account' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password' });
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

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
};
