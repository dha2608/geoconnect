import { Router } from 'express';
import { getMe, updateMe, uploadAvatar, getUserById, followUser, unfollowUser, getNearbyUsers, updateLocation, searchUsers, getFollowers, getFollowing, getSettings, updateSettings } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.put('/me/location', authenticate, updateLocation);
router.get('/me/settings', authenticate, getSettings);
router.put('/me/settings', authenticate, updateSettings);
router.get('/nearby', authenticate, getNearbyUsers);
router.get('/search', authenticate, searchUsers);
router.get('/:id', getUserById);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.post('/:id/follow', authenticate, followUser);
router.delete('/:id/follow', authenticate, unfollowUser);

export default router;
