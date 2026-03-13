import Pin from '../models/Pin.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';

export const getPinsByViewport = async (req, res) => {
  try {
    const { swLat, swLng, neLat, neLng, categories } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ message: 'Viewport bounds required' });
    }
    
    const filter = {
      location: {
        $geoWithin: {
          $box: [
            [parseFloat(swLng), parseFloat(swLat)],
            [parseFloat(neLng), parseFloat(neLat)],
          ],
        },
      },
      visibility: 'public',
    };
    
    if (categories) {
      filter.category = { $in: categories.split(',') };
    }
    
    const pins = await Pin.find(filter)
      .populate('createdBy', 'name avatar')
      .limit(200);
    
    res.json(pins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getNearbyPins = async (req, res) => {
  try {
    const { lat, lng, radius = 5, limit = 20 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });
    
    const pins = await Pin.find({
      visibility: 'public',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    }).populate('createdBy', 'name avatar').limit(parseInt(limit));
    
    res.json(pins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPin = async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id)
      .populate('createdBy', 'name avatar');
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    res.json(pin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createPin = async (req, res) => {
  try {
    const { title, description, category, lat, lng, address, visibility, tags } = req.body;
    
    let images = [];
    if (req.files && req.files.length > 0) {
      const uploads = req.files.map(file => uploadToCloudinary(file.buffer, 'geoconnect/pins'));
      const results = await Promise.all(uploads);
      images = results.map(r => r.secure_url);
    }
    
    const pin = await Pin.create({
      title,
      description,
      category,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      address,
      images,
      createdBy: req.user._id,
      visibility: visibility || 'public',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });
    
    const populated = await pin.populate('createdBy', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updatePin = async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id);
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    if (pin.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const allowedFields = ['title', 'description', 'category', 'visibility', 'tags'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, 'geoconnect/pins'));
      const results = await Promise.all(uploadPromises);
      const newImages = results.map(r => r.secure_url);
      // Keep existing images that weren't removed, add new ones
      const keepImages = req.body.keepImages ? JSON.parse(req.body.keepImages) : pin.images;
      updates.images = [...keepImages, ...newImages].slice(0, 5); // max 5 images
    } else if (req.body.keepImages) {
      // No new uploads, but user removed some existing images
      updates.images = JSON.parse(req.body.keepImages);
    }

    // Handle location update
    if (req.body.lat && req.body.lng) {
      updates.location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] };
    }

    // Handle tags as comma-separated string
    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    
    const updated = await Pin.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name avatar');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deletePin = async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id);
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    if (pin.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Review.deleteMany({ pin: pin._id });
    await pin.deleteOne();
    res.json({ message: 'Pin deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const likePin = async (req, res) => {
  try {
    const pin = await Pin.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );
    if (!pin) return res.status(404).json({ message: 'Pin not found' });

    // Notify pin creator
    await createNotification(req, {
      recipientId: pin.createdBy,
      senderId: req.user._id,
      type: 'like',
      data: { pinId: pin._id, pinTitle: pin.title },
    });

    res.json({ likes: pin.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unlikePin = async (req, res) => {
  try {
    const pin = await Pin.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    );
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    res.json({ likes: pin.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const savePin = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPins: req.params.id } });
    res.json({ message: 'Pin saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unsavePin = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedPins: req.params.id } });
    res.json({ message: 'Pin unsaved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTrendingPins = async (req, res) => {
  try {
    const pins = await Pin.aggregate([
      { $match: { visibility: 'public' } },
      { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $sort: { likesCount: -1, createdAt: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdByArr',
        },
      },
      { $addFields: { createdBy: { $arrayElemAt: ['$createdByArr', 0] } } },
      {
        $project: {
          createdByArr: 0,
          'createdBy.password': 0,
          'createdBy.email': 0,
          'createdBy.location': 0,
        },
      },
    ]);
    res.json(pins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trending pins' });
  }
};

export const searchPins = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters' });

    const regex = { $regex: q, $options: 'i' };
    const pins = await Pin.find({
      visibility: 'public',
      $or: [
        { title: regex },
        { description: regex },
        { address: regex },
        { tags: regex },
      ],
    })
      .populate('createdBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(pins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSavedPins = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('savedPins');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const pins = await Pin.find({ _id: { $in: user.savedPins || [] } })
      .populate('creator', 'username name avatar')
      .limit(50);
    res.json(pins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved pins' });
  }
};
