import { Router } from 'express';
import { getMe, updateMe, uploadAvatar, getUserById, followUser, unfollowUser, getNearbyUsers, getLiveNearbyUsers, updateLocation, searchUsers, getFollowers, getFollowing, getSettings, updateSettings, blockUser, unblockUser, getBlockedUsers, deleteAccount, getUserStats } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { validateUpdateMe, validateUpdateLocation, validateGetNearbyUsers, validateUpdateSettings, validateUserParamId, validateDeleteAccount } from '../validators/index.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, validateUpdateMe, validate, updateMe);
router.delete('/me', authenticate, validateDeleteAccount, validate, deleteAccount);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.put('/me/location', authenticate, validateUpdateLocation, validate, updateLocation);
router.get('/me/settings', authenticate, getSettings);
router.put('/me/settings', authenticate, validateUpdateSettings, validate, updateSettings);
router.get('/me/blocked', authenticate, getBlockedUsers);
router.get('/nearby', authenticate, validateGetNearbyUsers, validate, getNearbyUsers);
router.get('/live-nearby', authenticate, validateGetNearbyUsers, validate, getLiveNearbyUsers);
router.get('/search', authenticate, searchUsers);
router.get('/:id', validateUserParamId, validate, getUserById);
router.get('/:id/stats', validateUserParamId, validate, getUserStats);
router.get('/:id/followers', validateUserParamId, validate, getFollowers);
router.get('/:id/following', validateUserParamId, validate, getFollowing);
router.post('/:id/follow', authenticate, validateUserParamId, validate, followUser);
router.delete('/:id/follow', authenticate, validateUserParamId, validate, unfollowUser);
router.post('/:id/block', authenticate, validateUserParamId, validate, blockUser);
router.delete('/:id/block', authenticate, validateUserParamId, validate, unblockUser);

export default router;
