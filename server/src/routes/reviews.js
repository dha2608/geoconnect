import { Router } from 'express';
import { getReviews, createReview, updateReview, deleteReview } from '../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/pins/:pinId/reviews', optionalAuth, getReviews);
router.post('/pins/:pinId/reviews', authenticate, createReview);
router.put('/pins/:pinId/reviews/:reviewId', authenticate, updateReview);
router.delete('/pins/:pinId/reviews/:reviewId', authenticate, deleteReview);

export default router;
