import { Router } from 'express';
import {
  getFeed, getMapPosts, createPost, deletePost, likePost, unlikePost,
  getPost, updatePost, addComment, editComment, deleteComment,
  likeComment, unlikeComment, getUserPosts, getComments,
  savePost, unsavePost, getSavedPosts,
  sharePost, repostPost, undoRepost,
  getPostsByHashtag,
  replyToComment, getReplies, deleteReply,
  addCommentReaction, removeCommentReaction,
} from '../controllers/postController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  validateCreatePost, validateUpdatePost, validateAddComment,
  validateEditComment, validateCommentId, validatePostId, validateUserId,
  validateHashtag, validateRepost,
  validateReplyToComment, validateReplyId, validateCommentReaction,
} from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

// Feed & queries
router.get('/feed', authenticate, paginate, getFeed);
router.get('/map', optionalAuth, getMapPosts);
router.get('/saved', authenticate, paginate, getSavedPosts);
router.get('/hashtag/:tag', authenticate, validateHashtag, validate, paginate, getPostsByHashtag);
router.get('/user/:userId', authenticate, validateUserId, validate, paginate, getUserPosts);

// CRUD
router.post('/', authenticate, upload.array('images', 6), validateCreatePost, validate, createPost);
router.get('/:id', authenticate, validatePostId, validate, getPost);
router.put('/:id', authenticate, validateUpdatePost, validate, updatePost);
router.delete('/:id', authenticate, validatePostId, validate, deletePost);

// Like
router.post('/:id/like', authenticate, validatePostId, validate, likePost);
router.delete('/:id/like', authenticate, validatePostId, validate, unlikePost);

// Save / Bookmark
router.post('/:id/save', authenticate, validatePostId, validate, savePost);
router.delete('/:id/save', authenticate, validatePostId, validate, unsavePost);

// Share & Repost
router.post('/:id/share', authenticate, validatePostId, validate, sharePost);
router.post('/:id/repost', authenticate, validateRepost, validate, repostPost);
router.delete('/:id/repost', authenticate, validatePostId, validate, undoRepost);

// Comments
router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comments', authenticate, validateAddComment, validate, addComment);
router.put('/:id/comments/:commentId', authenticate, validateEditComment, validate, editComment);
router.delete('/:id/comments/:commentId', authenticate, validateCommentId, validate, deleteComment);
router.post('/:id/comments/:commentId/like', authenticate, validateCommentId, validate, likeComment);
router.delete('/:id/comments/:commentId/like', authenticate, validateCommentId, validate, unlikeComment);

// Comment Replies
router.post('/:id/comments/:commentId/replies', authenticate, validateReplyToComment, validate, replyToComment);
router.get('/:id/comments/:commentId/replies', authenticate, validateCommentId, validate, paginate, getReplies);
router.delete('/:id/comments/:commentId/replies/:replyId', authenticate, validateReplyId, validate, deleteReply);

// Comment Reactions
router.post('/:id/comments/:commentId/reactions', authenticate, validateCommentReaction, validate, addCommentReaction);
router.delete('/:id/comments/:commentId/reactions', authenticate, validateCommentId, validate, removeCommentReaction);

export default router;
