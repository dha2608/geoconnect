import { Router } from 'express';
import { getFeed, getMapPosts, createPost, deletePost, likePost, unlikePost, getPost, updatePost, addComment, deleteComment, getUserPosts } from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateCreatePost, validateUpdatePost, validateAddComment, validatePostId, validateUserId } from '../validators/index.js';

const router = Router();

router.get('/feed', authenticate, getFeed);
router.get('/map', authenticate, getMapPosts);
router.get('/user/:userId', authenticate, validateUserId, validate, getUserPosts);
router.post('/', authenticate, validateCreatePost, validate, createPost);
router.get('/:id', authenticate, validatePostId, validate, getPost);
router.put('/:id', authenticate, validateUpdatePost, validate, updatePost);
router.delete('/:id', authenticate, validatePostId, validate, deletePost);
router.post('/:id/like', authenticate, validatePostId, validate, likePost);
router.delete('/:id/like', authenticate, validatePostId, validate, unlikePost);
router.post('/:id/comments', authenticate, validateAddComment, validate, addComment);
router.delete('/:id/comments/:commentId', authenticate, deleteComment);

export default router;
