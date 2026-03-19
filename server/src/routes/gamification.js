import { Router } from 'express';
import {
  getMyProgress,
  getUserProgress,
  dailyLogin,
  getDailyChallenges,
  getAllAchievements,
  getLeaderboard,
  getLevels,
  getXPHistory,
  seed,
} from '../controllers/gamificationController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

// Public / optionalAuth
router.get('/achievements', optionalAuth, getAllAchievements);
router.get('/leaderboard', optionalAuth, paginate, getLeaderboard);
router.get('/levels', getLevels);
router.get('/users/:userId', optionalAuth, getUserProgress);

// Authenticated
router.get('/me', authenticate, getMyProgress);
router.post('/daily-login', authenticate, dailyLogin);
router.get('/daily-challenges', authenticate, getDailyChallenges);
router.get('/xp-history', authenticate, getXPHistory);

// Admin
router.post('/seed', authenticate, requireAdmin, seed);

export default router;
