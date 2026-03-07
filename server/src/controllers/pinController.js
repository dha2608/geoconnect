import Pin from '../models/Pin.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';

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
