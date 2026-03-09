import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';

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
    
    const users = await User.find({
      _id: { $ne: req.user._id },
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
    
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name avatar bio followers following').limit(20);
    
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
