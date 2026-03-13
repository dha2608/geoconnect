import { Router } from 'express';
import {
  getDiscoverFeed,
  getRecommendedPins,
  getPopularCategories,
  getSuggestedUsers,
} from '../controllers/discoverController.js';
import { optionalAuth } from '../middleware/auth.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

// GET /api/discover/feed
// Unified discovery feed: trending pins, upcoming events, active users, recent posts
router.get('/feed', optionalAuth, getDiscoverFeed);

// GET /api/discover/recommended
// Personalised pin recommendations (category-matched for auth users, trending for anon)
router.get('/recommended', optionalAuth, paginate, getRecommendedPins);

// GET /api/discover/categories
// Pin counts grouped by category; optional ?lat=&lng= scopes to 50 km radius
router.get('/categories', optionalAuth, getPopularCategories);

// GET /api/discover/people
// Suggested users to follow (friends-of-friends for auth, most-followed for anon)
router.get('/people', optionalAuth, getSuggestedUsers);

export default router;
