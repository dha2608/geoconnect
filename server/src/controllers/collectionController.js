import Collection from '../models/Collection.js';

// GET /api/collections/mine
export const getMyCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('pins', 'title images category');
    res.json({ data: collections });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/collections/public
export const getPublicCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ isPublic: true })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('owner', 'name avatar')
      .populate('pins', 'title images category');
    res.json({ data: collections });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/collections/:id
export const getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('owner', 'name avatar')
      .populate('pins', 'title images category location');

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // If private, only owner may view
    const ownerId = collection.owner._id ?? collection.owner;
    const requesterId = req.user?._id?.toString();
    if (!collection.isPublic && ownerId.toString() !== requesterId) {
      return res.status(403).json({ message: 'This collection is private' });
    }

    res.json({ data: collection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/collections
export const createCollection = async (req, res) => {
  try {
    const { name, description, isPublic, emoji, coverImage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Collection name is required' });
    }

    // Max 20 collections per user
    const count = await Collection.countDocuments({ owner: req.user._id });
    if (count >= 20) {
      return res.status(400).json({ message: 'You can have at most 20 collections' });
    }

    const collection = await Collection.create({
      name: name.trim(),
      description: description?.trim() ?? '',
      owner: req.user._id,
      isPublic: isPublic ?? false,
      emoji: emoji ?? '📌',
      coverImage: coverImage ?? '',
    });

    res.status(201).json({ data: collection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/collections/:id
export const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to update this collection' });
    }

    const { name, description, isPublic, emoji, coverImage } = req.body;
    if (name !== undefined) collection.name = name.trim();
    if (description !== undefined) collection.description = description.trim();
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (emoji !== undefined) collection.emoji = emoji;
    if (coverImage !== undefined) collection.coverImage = coverImage;

    await collection.save();
    res.json({ data: collection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/collections/:id
export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to delete this collection' });
    }

    await collection.deleteOne();
    res.json({ message: 'Collection deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/collections/:id/pins/:pinId
export const addPinToCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to modify this collection' });
    }

    await Collection.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { pins: req.params.pinId } },
      { new: true }
    );

    res.json({ message: 'Pin added to collection' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/collections/:id/pins/:pinId
export const removePinFromCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to modify this collection' });
    }

    await Collection.findByIdAndUpdate(
      req.params.id,
      { $pull: { pins: req.params.pinId } },
      { new: true }
    );

    res.json({ message: 'Pin removed from collection' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
