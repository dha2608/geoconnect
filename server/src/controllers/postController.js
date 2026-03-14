import Post from '../models/Post.js';
import { createNotification } from '../utils/createNotification.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

export const getFeed = asyncHandler(async (req, res) => {
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

  return paginated(res, posts, { page, limit, total });
});

export const getMapPosts = asyncHandler(async (req, res) => {
  const { swLat, swLng, neLat, neLng } = req.query;
  if (!swLat || !swLng || !neLat || !neLng) {
    throw AppError.badRequest('Viewport bounds required');
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

  return ok(res, posts);
});

export const createPost = asyncHandler(async (req, res) => {
  // Accept both 'content' (client FormData) and 'text' (API compat)
  const text = (req.body.content || req.body.text || '').trim();
  if (!text) {
    throw AppError.badRequest('Post text is required');
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
  return created(res, populated);
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  if (post.author.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  await post.deleteOne();
  return message(res, 'Post deleted');
});

export const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { likes: req.user._id } },
    { new: true }
  );
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  // Notify post author
  await createNotification(req, {
    recipientId: post.author,
    senderId: req.user._id,
    type: 'like',
    data: { postId: post._id, preview: post.text?.slice(0, 80) },
  });

  return ok(res, { likes: post.likes });
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'name avatar')
    .populate('comments.user', 'name avatar');
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  return ok(res, post);
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  if (post.author.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const { text } = req.body;
  if (text !== undefined) post.text = text;
  await post.save();

  const populated = await post.populate('author', 'name avatar');
  return ok(res, populated);
});

export const addComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const { text } = req.body;
  if (!text || !text.trim()) throw AppError.badRequest('Comment text is required');

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
  return ok(res, populated.comments);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const comment = post.comments.id(req.params.commentId);
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Only comment author or post author can delete
  const isCommentAuthor = comment.user.toString() === req.user._id.toString();
  const isPostAuthor = post.author.toString() === req.user._id.toString();
  if (!isCommentAuthor && !isPostAuthor) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized to delete this comment');
  }

  post.comments.pull({ _id: req.params.commentId });
  await post.save();

  return message(res, 'Comment deleted');
});

export const unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: req.user._id } },
    { new: true }
  );
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  return ok(res, { likes: post.likes });
});

export const getUserPosts = asyncHandler(async (req, res) => {
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

  return paginated(res, posts, { page, limit, total });
});
