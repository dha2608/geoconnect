import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import { createNotification } from '../utils/createNotification.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';
import { awardXP, incrementDailyChallenge } from '../services/xpService.js';
import { checkAchievements } from '../services/achievementChecker.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract unique lowercase hashtags from text */
function extractHashtags(text) {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  if (!matches) return [];
  return [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
}

// ─── Feed & Queries ───────────────────────────────────────────────────────────

export const getFeed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;

  const user = req.user;
  const followingIds = user.following.map(id => id.toString());

  // Own posts (all visibility) + following posts (public + followers) 
  const filter = {
    $or: [
      { author: user._id },
      { author: { $in: user.following }, visibility: { $in: ['public', 'followers'] } },
    ],
  };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate('author', 'name avatar')
      .populate({ path: 'repostOf', populate: { path: 'author', select: 'name avatar' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(filter),
  ]);

  return paginated(res, posts, { page, limit, total });
});

export const getMapPosts = asyncHandler(async (req, res) => {
  const { swLat, swLng, neLat, neLng } = req.query;
  if (!swLat || !swLng || !neLat || !neLng) {
    throw AppError.badRequest('Viewport bounds required');
  }

  // Only public posts on map (+ own posts)
  const userId = req.user?._id;
  const filter = {
    location: {
      $geoWithin: {
        $box: [
          [parseFloat(swLng), parseFloat(swLat)],
          [parseFloat(neLng), parseFloat(neLat)],
        ],
      },
    },
    $or: [
      { visibility: 'public' },
      ...(userId ? [{ author: userId }] : []),
    ],
  };

  const posts = await Post.find(filter)
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return ok(res, posts);
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

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

  // Upload images to Cloudinary in parallel (multer populates req.files)
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploads = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, 'geoconnect/posts'))
    );
    images = uploads.map((r) => r.secure_url);
  }

  // Visibility (default: public)
  const visibility = ['public', 'followers', 'private'].includes(req.body.visibility)
    ? req.body.visibility
    : 'public';

  // Auto-extract hashtags
  const hashtags = extractHashtags(text);

  const post = await Post.create({
    author: req.user._id,
    text,
    images,
    location,
    address,
    visibility,
    hashtags,
  });

  const populated = await post.populate('author', 'name avatar');

  // Gamification: award XP for post creation (fire-and-forget)
  awardXP(req.user._id, 'POST_CREATE', { postId: post._id }).catch((err) => console.error('[Gamification] awardXP POST_CREATE failed:', err.message));
  incrementDailyChallenge(req.user._id, 'create_post').catch((err) => console.error('[Gamification] incrementDailyChallenge create_post failed:', err.message));
  checkAchievements(req.user._id, 'POST_CREATE').catch((err) => console.error('[Gamification] checkAchievements POST_CREATE failed:', err.message));

  return created(res, populated);
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  if (post.author.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const { text, visibility } = req.body;

  if (text !== undefined) {
    post.text = text;
    post.hashtags = extractHashtags(text);
  }

  if (visibility !== undefined && ['public', 'followers', 'private'].includes(visibility)) {
    post.visibility = visibility;
  }

  await post.save();

  const populated = await post.populate('author', 'name avatar');
  return ok(res, populated);
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  if (post.author.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  await post.deleteOne();
  await Comment.deleteMany({ post: post._id });
  // Also delete any reposts of this post
  await Post.deleteMany({ repostOf: post._id });
  return message(res, 'Post deleted');
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'name avatar')
    .populate({ path: 'repostOf', populate: { path: 'author', select: 'name avatar' } })
    .lean();
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  // Visibility check: private posts only visible to author
  const authorId = post.author._id.toString();
  if (post.visibility === 'private' && authorId !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'This post is private');
  }

  // Followers-only: check if requester follows author
  if (post.visibility === 'followers' && authorId !== req.user._id.toString()) {
    const author = await User.findById(post.author._id).select('followers').lean();
    if (!author.followers.some(id => id.toString() === req.user._id.toString())) {
      throw new AppError(ERR.FORBIDDEN, 'This post is only visible to followers');
    }
  }

  const comments = await Comment.find({ post: req.params.id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  return ok(res, { ...post, comments });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const isOwn = req.params.userId === req.user._id.toString();

  let visibilityFilter;
  if (isOwn) {
    // Own profile: show all posts
    visibilityFilter = {};
  } else {
    // Check if current user follows this user
    const targetUser = await User.findById(req.params.userId).select('followers');
    const isFollowing = targetUser?.followers.some(id => id.toString() === req.user._id.toString());
    visibilityFilter = isFollowing
      ? { visibility: { $in: ['public', 'followers'] } }
      : { visibility: 'public' };
  }

  const filter = { author: req.params.userId, ...visibilityFilter };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name avatar')
      .populate({ path: 'repostOf', populate: { path: 'author', select: 'name avatar' } })
      .lean(),
    Post.countDocuments(filter),
  ]);

  return paginated(res, posts, { page, limit, total });
});

// ─── Likes ────────────────────────────────────────────────────────────────────

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

  // Gamification: award XP to post author for receiving a like (fire-and-forget)
  if (post.author.toString() !== req.user._id.toString()) {
    awardXP(post.author, 'LIKE_RECEIVED', { postId: post._id }).catch((err) => console.error('[Gamification] awardXP LIKE_RECEIVED failed:', err.message));
    checkAchievements(post.author, 'LIKE_RECEIVED').catch((err) => console.error('[Gamification] checkAchievements LIKE_RECEIVED failed:', err.message));
  }

  return ok(res, { likes: post.likes });
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

// ─── Save / Bookmark ──────────────────────────────────────────────────────────

export const savePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { saves: req.user._id } },
    { new: true }
  );
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  return ok(res, { saves: post.saves });
});

export const unsavePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $pull: { saves: req.user._id } },
    { new: true }
  );
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  return ok(res, { saves: post.saves });
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;

  const filter = { saves: req.user._id };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .populate({ path: 'repostOf', populate: { path: 'author', select: 'name avatar' } })
      .lean(),
    Post.countDocuments(filter),
  ]);

  return paginated(res, posts, { page, limit, total });
});

// ─── Share ────────────────────────────────────────────────────────────────────

export const sharePost = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { shareCount: 1 } },
    { new: true }
  );
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);
  return ok(res, { shareCount: post.shareCount });
});

// ─── Repost ───────────────────────────────────────────────────────────────────

export const repostPost = asyncHandler(async (req, res) => {
  const originalPost = await Post.findById(req.params.id);
  if (!originalPost) throw new AppError(ERR.POST_NOT_FOUND);

  // Can't repost own post
  if (originalPost.author.toString() === req.user._id.toString()) {
    throw AppError.badRequest('Cannot repost your own post');
  }

  // Can't repost a repost — repost the original instead
  const sourceId = originalPost.repostOf || originalPost._id;

  // Check if user already reposted this
  const existing = await Post.findOne({ author: req.user._id, repostOf: sourceId });
  if (existing) {
    throw AppError.badRequest('You already reposted this');
  }

  // Optional text (quote repost)
  const text = (req.body.text || '').trim() || originalPost.text;
  const hashtags = extractHashtags(text);

  const repost = await Post.create({
    author: req.user._id,
    text,
    repostOf: sourceId,
    hashtags,
    visibility: req.body.visibility || 'public',
    // Inherit location/images from original
    location: originalPost.location,
    address: originalPost.address,
    images: originalPost.images,
  });

  // Increment share count on original
  await Post.findByIdAndUpdate(sourceId, { $inc: { shareCount: 1 } });

  // Notify original author
  await createNotification(req, {
    recipientId: originalPost.author,
    senderId: req.user._id,
    type: 'like', // reuse 'like' type for now
    data: { postId: originalPost._id, preview: `reposted your post` },
  });

  const populated = await repost.populate([
    { path: 'author', select: 'name avatar' },
    { path: 'repostOf', populate: { path: 'author', select: 'name avatar' } },
  ]);

  return created(res, populated);
});

export const undoRepost = asyncHandler(async (req, res) => {
  const repost = await Post.findOne({ author: req.user._id, repostOf: req.params.id });
  if (!repost) throw AppError.badRequest('You have not reposted this');

  await repost.deleteOne();

  // Decrement share count on original
  await Post.findByIdAndUpdate(req.params.id, { $inc: { shareCount: -1 } });

  return message(res, 'Repost removed');
});

// ─── Hashtags ─────────────────────────────────────────────────────────────────

export const getPostsByHashtag = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const tag = req.params.tag.toLowerCase();

  const filter = { hashtags: tag, visibility: 'public' };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .populate({ path: 'repostOf', populate: { path: 'author', select: 'name avatar' } })
      .lean(),
    Post.countDocuments(filter),
  ]);

  return paginated(res, posts, { page, limit, total });
});

// ─── Comments ─────────────────────────────────────────────────────────────────

const ALLOWED_COMMENT_REACTIONS = ['❤️', '😂', '👍', '👎', '😮', '😢', '🔥'];

export const addComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const { text } = req.body;
  if (!text || !text.trim()) throw AppError.badRequest('Comment text is required');

  const comment = await Comment.create({
    post: post._id,
    user: req.user._id,
    text: text.trim(),
  });

  // Increment comment count on post
  await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

  // Notify post author
  await createNotification(req, {
    recipientId: post.author,
    senderId: req.user._id,
    type: 'comment',
    data: { postId: post._id, preview: text.trim().slice(0, 80) },
  });

  // Gamification: award XP to post author for receiving a comment (fire-and-forget)
  if (post.author.toString() !== req.user._id.toString()) {
    awardXP(post.author, 'COMMENT_RECEIVED', { postId: post._id }).catch((err) => console.error('[Gamification] awardXP COMMENT_RECEIVED failed:', err.message));
    checkAchievements(post.author, 'COMMENT_RECEIVED').catch((err) => console.error('[Gamification] checkAchievements COMMENT_RECEIVED failed:', err.message));
  }
  incrementDailyChallenge(req.user._id, 'comment_post').catch((err) => console.error('[Gamification] incrementDailyChallenge comment_post failed:', err.message));

  const populated = await comment.populate('user', 'name avatar');
  return ok(res, populated);
});

export const editComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Only comment author can edit
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized to edit this comment');
  }

  const { text } = req.body;
  if (!text || !text.trim()) throw AppError.badRequest('Comment text is required');

  comment.text = text.trim();
  comment.isEdited = true;
  await comment.save();

  const populated = await comment.populate('user', 'name avatar');
  return ok(res, populated);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Only comment author or post author can delete
  const isCommentAuthor = comment.user.toString() === req.user._id.toString();
  const isPostAuthor = post.author.toString() === req.user._id.toString();
  if (!isCommentAuthor && !isPostAuthor) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized to delete this comment');
  }

  await comment.deleteOne();
  // Decrement comment count on post
  await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: -1 } });
  return message(res, 'Comment deleted');
});

export const likeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { $addToSet: { likes: req.user._id } },
    { new: true }
  ).populate('user', 'name avatar');
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Notify comment author (if not self)
  if (comment.user._id.toString() !== req.user._id.toString()) {
    await createNotification(req, {
      recipientId: comment.user._id,
      senderId: req.user._id,
      type: 'like',
      data: { commentId: comment._id, postId: req.params.id, preview: comment.text.slice(0, 80) },
    });
  }

  return ok(res, comment);
});

export const unlikeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { $pull: { likes: req.user._id } },
    { new: true }
  ).populate('user', 'name avatar');
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);
  return ok(res, comment);
});

export const getComments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Only fetch top-level comments (no parent)
  const filter = { post: req.params.id, parentComment: null };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return paginated(res, comments, { page, limit, total });
});

// ─── Nested Replies ───────────────────────────────────────────────────────────

export const replyToComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const parentComment = await Comment.findById(req.params.commentId);
  if (!parentComment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Only allow one level of nesting (reply to top-level only)
  if (parentComment.parentComment) {
    throw AppError.badRequest('Cannot reply to a reply. Reply to the parent comment instead.');
  }

  const { text } = req.body;
  if (!text || !text.trim()) throw AppError.badRequest('Reply text is required');

  const reply = await Comment.create({
    post: post._id,
    user: req.user._id,
    text: text.trim(),
    parentComment: parentComment._id,
  });

  // Increment reply count on parent and comment count on post
  await Promise.all([
    Comment.findByIdAndUpdate(parentComment._id, { $inc: { replyCount: 1 } }),
    Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } }),
  ]);

  // Notify parent comment author
  if (parentComment.user.toString() !== req.user._id.toString()) {
    await createNotification(req, {
      recipientId: parentComment.user,
      senderId: req.user._id,
      type: 'comment',
      data: { postId: post._id, commentId: parentComment._id, preview: text.trim().slice(0, 80) },
    });
  }

  const populated = await reply.populate('user', 'name avatar');
  return created(res, populated);
});

export const getReplies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { parentComment: req.params.commentId };

  const [replies, total] = await Promise.all([
    Comment.find(filter)
      .populate('user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .sort({ createdAt: 1 }) // oldest first for replies
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return paginated(res, replies, { page, limit, total });
});

export const deleteReply = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError(ERR.POST_NOT_FOUND);

  const reply = await Comment.findById(req.params.replyId);
  if (!reply) throw new AppError(ERR.COMMENT_NOT_FOUND);
  if (!reply.parentComment) throw AppError.badRequest('This is not a reply');

  const isReplyAuthor = reply.user.toString() === req.user._id.toString();
  const isPostAuthor = post.author.toString() === req.user._id.toString();
  if (!isReplyAuthor && !isPostAuthor) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized to delete this reply');
  }

  const parentId = reply.parentComment;
  await reply.deleteOne();

  await Promise.all([
    Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: -1 } }),
    Post.findByIdAndUpdate(post._id, { $inc: { commentCount: -1 } }),
  ]);

  return message(res, 'Reply deleted');
});

// ─── Comment Reactions ────────────────────────────────────────────────────────

export const addCommentReaction = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!ALLOWED_COMMENT_REACTIONS.includes(emoji)) {
    throw AppError.badRequest('Invalid reaction emoji');
  }

  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);

  // Remove existing reaction from this user (replace)
  comment.reactions = comment.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );
  comment.reactions.push({ user: req.user._id, emoji });
  await comment.save();

  const populated = await comment.populate([
    { path: 'user', select: 'name avatar' },
    { path: 'reactions.user', select: 'name avatar' },
  ]);
  return ok(res, populated);
});

export const removeCommentReaction = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { $pull: { reactions: { user: req.user._id } } },
    { new: true }
  ).populate([
    { path: 'user', select: 'name avatar' },
    { path: 'reactions.user', select: 'name avatar' },
  ]);
  if (!comment) throw new AppError(ERR.COMMENT_NOT_FOUND);
  return ok(res, comment);
});
