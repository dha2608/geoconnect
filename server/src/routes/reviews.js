import { Router } from 'express';
import { getReviews, createReview, updateReview, deleteReview, voteHelpful, unvoteHelpful, respondToReview, deleteResponse } from '../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateCreateReview, validateUpdateReview, validateReviewParams, validatePinIdParam, validateReviewResponse } from '../validators/index.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/pins/:pinId/reviews', optionalAuth, validatePinIdParam, validate, getReviews);
router.post('/pins/:pinId/reviews', authenticate, upload.array('photos', 4), validateCreateReview, validate, createReview);
router.put('/pins/:pinId/reviews/:reviewId', authenticate, upload.array('photos', 4), validateUpdateReview, validate, updateReview);
router.delete('/pins/:pinId/reviews/:reviewId', authenticate, validateReviewParams, validate, deleteReview);
router.post('/pins/:pinId/reviews/:reviewId/helpful', authenticate, validateReviewParams, validate, voteHelpful);
router.delete('/pins/:pinId/reviews/:reviewId/helpful', authenticate, validateReviewParams, validate, unvoteHelpful);
router.post('/pins/:pinId/reviews/:reviewId/response', authenticate, validateReviewResponse, validate, respondToReview);
router.delete('/pins/:pinId/reviews/:reviewId/response', authenticate, validateReviewParams, validate, deleteResponse);

export default router;
