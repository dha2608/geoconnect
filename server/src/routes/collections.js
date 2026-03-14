import { Router } from 'express';
import {
  getMyCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  addPinToCollection,
  removePinFromCollection,
  getPublicCollections,
} from '../controllers/collectionController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/mine', authenticate, getMyCollections);
router.get('/public', optionalAuth, getPublicCollections);
router.post('/', authenticate, createCollection);
router.get('/:id', optionalAuth, getCollection);
router.put('/:id', authenticate, updateCollection);
router.delete('/:id', authenticate, deleteCollection);
router.post('/:id/pins/:pinId', authenticate, addPinToCollection);
router.delete('/:id/pins/:pinId', authenticate, removePinFromCollection);

export default router;
