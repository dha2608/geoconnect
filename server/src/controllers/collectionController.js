import crypto from 'crypto';
import Collection from '../models/Collection.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';
import { createNotification } from '../utils/createNotification.js';

/* ── Helpers ──────────────────────────────────────────────────────────── */
function canModify(collection, userId) {
  const uid = userId.toString();
  if (collection.owner._id?.toString() === uid || collection.owner.toString() === uid) return true;
  return collection.collaborators?.some(
    (c) => c.user.toString() === uid && c.role === 'editor',
  );
}

function isOwner(collection, userId) {
  const ownerId = collection.owner._id?.toString() ?? collection.owner.toString();
  return ownerId === userId.toString();
}

/* ── CRUD ─────────────────────────────────────────────────────────────── */

// GET /api/collections/mine
export const getMyCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({
    $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
  })
    .sort({ updatedAt: -1 })
    .populate('pins', 'title images category')
    .populate('collaborators.user', 'name avatar');
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
    .populate('pins', 'title images category location')
    .populate('collaborators.user', 'name avatar');

  if (!collection) throw AppError.notFound('Collection not found');

  const uid = req.user?._id?.toString();
  const isCollab = collection.collaborators?.some((c) => c.user._id?.toString() === uid);
  if (!collection.isPublic && !isOwner(collection, uid || '') && !isCollab) {
    throw new AppError(ERR.FORBIDDEN, 'This collection is private');
  }

  return ok(res, collection);
});

// POST /api/collections
export const createCollection = asyncHandler(async (req, res) => {
  const { name, description, isPublic, emoji, coverImage } = req.body;

  if (!name || !name.trim()) throw AppError.badRequest('Collection name is required');

  const count = await Collection.countDocuments({ owner: req.user._id });
  if (count >= 20) throw AppError.badRequest('You can have at most 20 collections');

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
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can update collection settings');
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
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can delete this collection');
  }

  await collection.deleteOne();
  return message(res, 'Collection deleted');
});

/* ── Pin Management ──────────────────────────────────────────────────── */

// POST /api/collections/:id/pins/:pinId
export const addPinToCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!canModify(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to modify this collection');
  }

  await Collection.findByIdAndUpdate(req.params.id, { $addToSet: { pins: req.params.pinId } });
  return message(res, 'Pin added to collection');
});

// DELETE /api/collections/:id/pins/:pinId
export const removePinFromCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!canModify(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised to modify this collection');
  }

  await Collection.findByIdAndUpdate(req.params.id, { $pull: { pins: req.params.pinId } });
  return message(res, 'Pin removed from collection');
});

/* ── Collaborators ───────────────────────────────────────────────────── */

// POST /api/collections/:id/collaborators
export const addCollaborator = asyncHandler(async (req, res) => {
  const { userId, role = 'viewer' } = req.body;
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can add collaborators');
  }

  if (collection.owner.toString() === userId) {
    throw AppError.badRequest('Cannot add the owner as a collaborator');
  }

  const existing = collection.collaborators.find((c) => c.user.toString() === userId);
  if (existing) {
    existing.role = role;
  } else {
    collection.collaborators.push({ user: userId, role });
  }

  await collection.save();

  // Notify the collaborator
  await createNotification({
    recipient: userId,
    sender: req.user._id,
    type: 'collection_invite',
    message: `invited you to collaborate on "${collection.name}"`,
    link: `/collections`,
  });

  const populated = await Collection.findById(collection._id)
    .populate('collaborators.user', 'name avatar');
  return ok(res, populated);
});

// PUT /api/collections/:id/collaborators/:userId
export const updateCollaboratorRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can change roles');
  }

  const collab = collection.collaborators.find((c) => c.user.toString() === req.params.userId);
  if (!collab) throw AppError.notFound('Collaborator not found');

  collab.role = role;
  await collection.save();

  const populated = await Collection.findById(collection._id)
    .populate('collaborators.user', 'name avatar');
  return ok(res, populated);
});

// DELETE /api/collections/:id/collaborators/:userId
export const removeCollaborator = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');

  const uid = req.user._id.toString();
  const targetId = req.params.userId;

  // Owner can remove anyone, collaborator can remove themselves
  if (!isOwner(collection, uid) && uid !== targetId) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorised');
  }

  collection.collaborators = collection.collaborators.filter(
    (c) => c.user.toString() !== targetId,
  );
  await collection.save();
  return message(res, 'Collaborator removed');
});

/* ── Sharing ─────────────────────────────────────────────────────────── */

// POST /api/collections/:id/share
export const generateShareLink = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can generate share links');
  }

  if (!collection.shareToken) {
    collection.shareToken = crypto.randomBytes(16).toString('hex');
    await collection.save();
  }

  return ok(res, { shareToken: collection.shareToken });
});

// DELETE /api/collections/:id/share
export const revokeShareLink = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw AppError.notFound('Collection not found');
  if (!isOwner(collection, req.user._id)) {
    throw new AppError(ERR.FORBIDDEN, 'Only the owner can revoke share links');
  }

  collection.shareToken = null;
  await collection.save();
  return message(res, 'Share link revoked');
});

// GET /api/collections/shared/:token
export const getSharedCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findOne({ shareToken: req.params.token })
    .populate('owner', 'name avatar')
    .populate('pins', 'title images category location')
    .populate('collaborators.user', 'name avatar');

  if (!collection) throw AppError.notFound('Collection not found or link expired');
  return ok(res, collection);
});

// POST /api/collections/shared/:token/join
export const joinViaShareLink = asyncHandler(async (req, res) => {
  const collection = await Collection.findOne({ shareToken: req.params.token });
  if (!collection) throw AppError.notFound('Collection not found or link expired');

  const uid = req.user._id.toString();
  if (isOwner(collection, uid)) {
    throw AppError.badRequest('You are the owner of this collection');
  }

  const existing = collection.collaborators.find((c) => c.user.toString() === uid);
  if (existing) {
    throw AppError.badRequest('You are already a collaborator');
  }

  collection.collaborators.push({ user: req.user._id, role: 'viewer' });
  await collection.save();

  return message(res, 'Joined collection as viewer');
});
