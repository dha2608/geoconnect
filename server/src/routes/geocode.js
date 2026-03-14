import { Router } from 'express';
import { searchGeocode, reverseGeocode } from '../controllers/geocodeController.js';
import { geocodeLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { validateSearchGeocode, validateReverseGeocode } from '../validators/index.js';

const router = Router();

// Use dedicated geocodeLimiter instead of the global apiLimiter to prevent
// double-counting (the global apiLimiter is already applied in server.js).
router.get('/search', geocodeLimiter, validateSearchGeocode, validate, searchGeocode);
router.get('/reverse', geocodeLimiter, validateReverseGeocode, validate, reverseGeocode);

export default router;
