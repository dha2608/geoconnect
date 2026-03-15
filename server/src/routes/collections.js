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
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  generateShareLink,
  revokeShareLink,
  getSharedCollection,
  joinViaShareLink,
} from '../controllers/collectionController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Core CRUD
router.get('/mine', authenticate, getMyCollections);
router.get('/public', optionalAuth, getPublicCollections);
router.post('/', authenticate, createCollection);

// Shared collection access via token
router.get('/shared/:token', optionalAuth, getSharedCollection);
router.post('/shared/:token/join', authenticate, joinViaShareLink);

// Single collection
router.get('/:id', optionalAuth, getCollection);
router.put('/:id', authenticate, updateCollection);
router.delete('/:id', authenticate, deleteCollection);

// Pin management
router.post('/:id/pins/:pinId', authenticate, addPinToCollection);
router.delete('/:id/pins/:pinId', authenticate, removePinFromCollection);

// Collaborators
router.post('/:id/collaborators', authenticate, addCollaborator);
router.put('/:id/collaborators/:userId', authenticate, updateCollaboratorRole);
router.delete('/:id/collaborators/:userId', authenticate, removeCollaborator);

// Share link
router.post('/:id/share', authenticate, generateShareLink);
router.delete('/:id/share', authenticate, revokeShareLink);

export default router;
