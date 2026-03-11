import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Specific static routes first — before /:id to avoid param collision
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/read-all', authenticate, markAllAsRead);

// Parameterised routes after
router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);

export default router;
