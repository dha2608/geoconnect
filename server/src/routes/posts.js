import { Router } from 'express';
import { getFeed, getMapPosts, createPost, deletePost, likePost, getPost, updatePost, addComment, getUserPosts } from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/feed', authenticate, getFeed);
router.get('/map', authenticate, getMapPosts);
router.get('/user/:userId', authenticate, getUserPosts);
router.post('/', authenticate, createPost);
router.get('/:id', authenticate, getPost);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, likePost);
router.post('/:id/comments', authenticate, addComment);

export default router;
