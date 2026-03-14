import Pin from '../models/Pin.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

export const getPinsByViewport = asyncHandler(async (req, res) => {
  const { swLat, swLng, neLat, neLng, categories } = req.query;
  if (!swLat || !swLng || !neLat || !neLng) {
    throw AppError.badRequest('Viewport bounds required');
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

  // Use pagination limit (max 100 from middleware) — viewport bounds already constrain results
  const pins = await Pin.find(filter)
    .populate('createdBy', 'name avatar')
    .limit(req.pagination.limit);

  return ok(res, pins);
});

export const getNearbyPins = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) throw AppError.badRequest('lat and lng required');

  const pins = await Pin.find({
    visibility: 'public',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) * 1000,
      },
    },
  }).populate('createdBy', 'name avatar').limit(req.pagination.limit);

  return ok(res, pins);
});

export const getPin = asyncHandler(async (req, res) => {
  const pin = await Pin.findById(req.params.id)
    .populate('createdBy', 'name avatar');
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);
  return ok(res, pin);
});

export const createPin = asyncHandler(async (req, res) => {
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
  return created(res, populated);
});

export const updatePin = asyncHandler(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);
  if (pin.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
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
  return ok(res, updated);
});

export const deletePin = asyncHandler(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);
  if (pin.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  await Review.deleteMany({ pin: pin._id });
  await pin.deleteOne();
  return message(res, 'Pin deleted');
});

export const likePin = asyncHandler(async (req, res) => {
  const pin = await Pin.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { likes: req.user._id } },
    { new: true }
  );
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);

  // Notify pin creator
  await createNotification(req, {
    recipientId: pin.createdBy,
    senderId: req.user._id,
    type: 'like',
    data: { pinId: pin._id, pinTitle: pin.title },
  });

  return ok(res, { likes: pin.likes });
});

export const unlikePin = asyncHandler(async (req, res) => {
  const pin = await Pin.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: req.user._id } },
    { new: true }
  );
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);
  return ok(res, { likes: pin.likes });
});

export const savePin = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPins: req.params.id } });
  return message(res, 'Pin saved');
});

export const unsavePin = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { savedPins: req.params.id } });
  return message(res, 'Pin unsaved');
});

export const getTrendingPins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const pins = await Pin.aggregate([
    { $match: { visibility: 'public' } },
    { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
    { $sort: { likesCount: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
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
  return ok(res, pins);
});

export const searchPins = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

  const { page, limit, skip } = req.pagination;

  let query;
  let projection = {};
  let sortOpts = { createdAt: -1 };

  if (q.length >= 3) {
    // Use MongoDB text index for longer queries — faster and relevance-scored
    query = { visibility: 'public', $text: { $search: q } };
    projection = { score: { $meta: 'textScore' } };
    sortOpts = { score: { $meta: 'textScore' } };
  } else {
    // Fallback to regex for very short queries (text index doesn't handle < 3 chars well)
    const regex = { $regex: q, $options: 'i' };
    query = {
      visibility: 'public',
      $or: [{ title: regex }, { description: regex }, { address: regex }, { tags: regex }],
    };
  }

  const [pins, total] = await Promise.all([
    Pin.find(query, projection)
      .populate('createdBy', 'name avatar')
      .sort(sortOpts)
      .skip(skip)
      .limit(limit),
    Pin.countDocuments(query),
  ]);

  return paginated(res, pins, { page, limit, total });
});

export const getSavedPins = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('savedPins');
  if (!user) throw AppError.notFound('User not found');
  const pins = await Pin.find({ _id: { $in: user.savedPins || [] } })
    .populate('creator', 'username name avatar')
    .limit(50);
  return ok(res, pins);
});

export const checkIn = asyncHandler(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);

  // Prevent duplicate check-in within the last 24 hours
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const alreadyCheckedIn = pin.checkIns.some(
    (ci) => ci.user.toString() === req.user._id.toString() && ci.checkedInAt > dayAgo
  );
  if (alreadyCheckedIn) {
    throw AppError.badRequest('Already checked in within 24 hours');
  }

  pin.checkIns.push({ user: req.user._id });
  await pin.save();

  // Notify pin creator
  if (pin.createdBy.toString() !== req.user._id.toString()) {
    await createNotification(req, {
      recipientId: pin.createdBy,
      senderId: req.user._id,
      type: 'checkin',
      data: { pinId: pin._id, pinTitle: pin.title },
    });
  }

  return ok(res, { checkIns: pin.checkIns, checkInCount: pin.checkIns.length });
});

export const undoCheckIn = asyncHandler(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin) throw new AppError(ERR.PIN_NOT_FOUND);

  // Remove the most recent check-in by this user
  const idx = [...pin.checkIns]
    .reverse()
    .findIndex((ci) => ci.user.toString() === req.user._id.toString());

  if (idx === -1) {
    throw AppError.badRequest('No check-in to undo');
  }

  // idx is from reversed array, convert to real index
  const realIdx = pin.checkIns.length - 1 - idx;
  pin.checkIns.splice(realIdx, 1);
  await pin.save();

  return ok(res, { checkIns: pin.checkIns, checkInCount: pin.checkIns.length });
});
