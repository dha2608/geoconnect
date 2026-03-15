import { Router } from 'express';
import {
  getAdminStats,
  getUsers,
  getUserAdmin,
  updateUserRole,
  toggleBanUser,
  deleteUserAdmin,
  getContentOverview,
  deleteContent,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/admin.js';

const router = Router();

// All admin routes require authentication + admin/moderator role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/stats', getAdminStats);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserAdmin);
router.put('/users/:id/role', requireSuperAdmin, updateUserRole);
router.put('/users/:id/ban', toggleBanUser);
router.delete('/users/:id', requireSuperAdmin, deleteUserAdmin);

// Content moderation
router.get('/content', getContentOverview);
router.delete('/content/:type/:id', deleteContent);

export default router;
