import { Router } from 'express';
import { searchGeocode, reverseGeocode } from '../controllers/geocodeController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { validateSearchGeocode, validateReverseGeocode } from '../validators/index.js';

const router = Router();

router.get('/search', apiLimiter, validateSearchGeocode, validate, searchGeocode);
router.get('/reverse', apiLimiter, validateReverseGeocode, validate, reverseGeocode);

export default router;
