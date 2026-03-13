import { Router } from 'express';
import { getReviews, createReview, updateReview, deleteReview, voteHelpful, unvoteHelpful } from '../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateCreateReview, validateUpdateReview, validateReviewParams, validatePinIdParam } from '../validators/index.js';

const router = Router();

router.get('/pins/:pinId/reviews', optionalAuth, validatePinIdParam, validate, getReviews);
router.post('/pins/:pinId/reviews', authenticate, validateCreateReview, validate, createReview);
router.put('/pins/:pinId/reviews/:reviewId', authenticate, validateUpdateReview, validate, updateReview);
router.delete('/pins/:pinId/reviews/:reviewId', authenticate, validateReviewParams, validate, deleteReview);
router.post('/pins/:pinId/reviews/:reviewId/helpful', authenticate, validateReviewParams, validate, voteHelpful);
router.delete('/pins/:pinId/reviews/:reviewId/helpful', authenticate, validateReviewParams, validate, unvoteHelpful);

export default router;
