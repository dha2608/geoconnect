import { Router } from 'express';
import { searchGeocode, reverseGeocode } from '../controllers/geocodeController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/search', apiLimiter, searchGeocode);
router.get('/reverse', apiLimiter, reverseGeocode);

export default router;
