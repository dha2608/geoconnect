import Post from '../models/Post.js';
import { createNotification } from '../utils/createNotification.js';
import { uploadToCloudinary } from '../middleware/upload.js';

export const getFeed = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;

    const user = req.user;
    const followingIds = [...user.following, user._id];

    const [posts, total] = await Promise.all([
      Post.find({ author: { $in: followingIds } })
        .populate('author', 'name avatar')
        .populate('comments.user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ author: { $in: followingIds } }),
    ]);

    res.json({
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMapPosts = async (req, res) => {
  try {
    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ message: 'Viewport bounds required' });
    }
    
    const posts = await Post.find({
      location: {
        $geoWithin: {
          $box: [
            [parseFloat(swLng), parseFloat(swLat)],
            [parseFloat(neLng), parseFloat(neLat)],
          ],
        },
      },
    }).populate('author', 'name avatar').sort({ createdAt: -1 }).limit(100);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    // Accept both 'content' (client FormData) and 'text' (API compat)
    const text = (req.body.content || req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Post text is required' });
    }

    // Parse location — client sends JSON string or separate lat/lng
    let location;
    let address = req.body.address || req.body.locationName || '';

    if (req.body.location) {
      try {
        const loc = JSON.parse(req.body.location);
        if (loc.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
          location = loc;
        }
      } catch {
        // Ignore JSON parse error — treat as no location
      }
    } else if (req.body.lat && req.body.lng) {
      location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] };
    }

    // Upload images to Cloudinary (multer populates req.files)
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'geoconnect/posts');
        images.push(result.secure_url);
      }
    }

    const post = await Post.create({
      author: req.user._id,
      text,
      images,
      location,
      address,
    });

    const populated = await post.populate('author', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Notify post author
    await createNotification(req, {
      recipientId: post.author,
      senderId: req.user._id,
      type: 'like',
      data: { postId: post._id, preview: post.text?.slice(0, 80) },
    });

    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name avatar')
      .populate('comments.user', 'name avatar');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { text } = req.body;
    if (text !== undefined) post.text = text;
    await post.save();
    
    const populated = await post.populate('author', 'name avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text is required' });
    
    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();

    // Notify post author
    await createNotification(req, {
      recipientId: post.author,
      senderId: req.user._id,
      type: 'comment',
      data: { postId: post._id, preview: text.trim().slice(0, 80) },
    });
    
    const populated = await post.populate('comments.user', 'name avatar');
    res.json(populated.comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Only comment author or post author can delete
    const isCommentAuthor = comment.user.toString() === req.user._id.toString();
    const isPostAuthor = post.author.toString() === req.user._id.toString();
    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    post.comments.pull({ _id: req.params.commentId });
    await post.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unlikePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.user._id } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const filter = { author: req.params.userId };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username name avatar'),
      Post.countDocuments(filter),
    ]);

    res.json({
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user posts' });
  }
};
