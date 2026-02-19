import { Router } from 'express';
import { getPinsByViewport, getNearbyPins, getPin, createPin, updatePin, deletePin, likePin, unlikePin, savePin, unsavePin } from '../controllers/pinController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', optionalAuth, getPinsByViewport);
router.get('/nearby', optionalAuth, getNearbyPins);
router.get('/:id', optionalAuth, getPin);
router.post('/', authenticate, upload.array('images', 5), createPin);
router.put('/:id', authenticate, updatePin);
router.delete('/:id', authenticate, deletePin);
router.post('/:id/like', authenticate, likePin);
router.delete('/:id/like', authenticate, unlikePin);
router.post('/:id/save', authenticate, savePin);
router.delete('/:id/save', authenticate, unsavePin);

export default router;
