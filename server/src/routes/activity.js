import { Router } from 'express';
import {
  getActivityStats,
  getRecentActivity,
  getActivityHeatmap,
} from '../controllers/activityController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/stats',   authenticate, getActivityStats);
router.get('/recent',  authenticate, getRecentActivity);
router.get('/heatmap', authenticate, getActivityHeatmap);

export default router;
