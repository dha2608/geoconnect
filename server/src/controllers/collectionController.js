import Collection from '../models/Collection.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

// GET /api/collections/mine
export const getMyCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({ owner: req.user._id })
    .sort({ updatedAt: -1 })
    .populate('pins', 'title images category');
  return ok(res, collections);
});

// GET /api/collections/public
export const getPublicCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({ isPublic: true })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate('owner', 'name avatar')
    .populate('pins', 'title images category');
  return ok(res, collections);
});

// GET /api/collections/:id
export const getCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id)
    .populate('owner', 'name avatar')
    .populate('pins', 'title images category location');

  if (!collection) {
    throw AppError.notFound('Collection not found');
  }

  // If private, only owner may view
  const ownerId = collection.owner._id ?? collection.owner;
  const requesterId = req.user?._id?.toString();
  if (!collection.isPublic && ownerId.toString() !== requesterId) {
    throw new AppError(ERR.FORBIDDEN, 'This collection is private');
  }

  return ok(res, collection);
});

// POST /api/collections
export const createCollection = asyncHandler(async (req, res) => {
  const { name, description, isPublic, emoji, coverImage } = req.body;

  if (!name || !name.trim()) {
    throw AppError.badRequest('Collection name is required');
  }

  // Max 20 collections per user
  const count = await Collection.countDocuments({ owner: req.user._id });
  if (count >= 20) {
    throw AppError.badRequest('You can have at most 20 collections');
  }

  const collection = await Collection.create({
    name: name.trim(),
    description: description?.trim() ?? '',
    owner: req.user._id,
    isPublic: isPublic ?? false,
    emoji: emoji ?? '📌',
    coverImage: coverImage ?? '',
  });

  return created(res, collection);
});

// PUT /api/collections/:id
export const updateCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    throw AppError.notFound('Collection not found');
  }

  if (collection.owner.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to update this collection');
  }

  const { name, description, isPublic, emoji, coverImage } = req.body;
  if (name !== undefined) collection.name = name.trim();
  if (description !== undefined) collection.description = description.trim();
  if (isPublic !== undefined) collection.isPublic = isPublic;
  if (emoji !== undefined) collection.emoji = emoji;
  if (coverImage !== undefined) collection.coverImage = coverImage;

  await collection.save();
  return ok(res, collection);
});

// DELETE /api/collections/:id
export const deleteCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    throw AppError.notFound('Collection not found');
  }

  if (collection.owner.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to delete this collection');
  }

  await collection.deleteOne();
  return message(res, 'Collection deleted');
});

// POST /api/collections/:id/pins/:pinId
export const addPinToCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    throw AppError.notFound('Collection not found');
  }

  if (collection.owner.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to modify this collection');
  }

  await Collection.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { pins: req.params.pinId } },
    { new: true }
  );

  return message(res, 'Pin added to collection');
});

// DELETE /api/collections/:id/pins/:pinId
export const removePinFromCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    throw AppError.notFound('Collection not found');
  }

  if (collection.owner.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to modify this collection');
  }

  await Collection.findByIdAndUpdate(
    req.params.id,
    { $pull: { pins: req.params.pinId } },
    { new: true }
  );

  return message(res, 'Pin removed from collection');
});
