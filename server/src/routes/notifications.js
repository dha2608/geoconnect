import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateNotificationId } from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

// Specific static routes first — before /:id to avoid param collision
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/clear', authenticate, clearAllNotifications);

// Parameterised routes after
router.get('/', authenticate, paginate, getNotifications);
router.put('/:id/read', authenticate, validateNotificationId, validate, markAsRead);
router.delete('/:id', authenticate, validateNotificationId, validate, deleteNotification);

export default router;
