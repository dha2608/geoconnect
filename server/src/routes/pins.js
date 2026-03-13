import { Router } from 'express';
import { getPinsByViewport, getNearbyPins, getTrendingPins, searchPins, getPin, createPin, updatePin, deletePin, likePin, unlikePin, savePin, unsavePin, getSavedPins } from '../controllers/pinController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { validateCreatePin, validateUpdatePin, validatePinId, validateUserId, validateSearchQuery } from '../validators/index.js';

const router = Router();

router.get('/', optionalAuth, getPinsByViewport);
router.get('/search', optionalAuth, validateSearchQuery, validate, searchPins);
router.get('/nearby', optionalAuth, getNearbyPins);
router.get('/trending', optionalAuth, getTrendingPins);
router.get('/saved/:userId', authenticate, validateUserId, validate, getSavedPins);
router.get('/:id', optionalAuth, validatePinId, validate, getPin);
router.post('/', authenticate, upload.array('images', 5), validateCreatePin, validate, createPin);
router.put('/:id', authenticate, upload.array('images', 5), validateUpdatePin, validate, updatePin);
router.delete('/:id', authenticate, validatePinId, validate, deletePin);
router.post('/:id/like', authenticate, validatePinId, validate, likePin);
router.delete('/:id/like', authenticate, validatePinId, validate, unlikePin);
router.post('/:id/save', authenticate, validatePinId, validate, savePin);
router.delete('/:id/save', authenticate, validatePinId, validate, unsavePin);

export default router;
