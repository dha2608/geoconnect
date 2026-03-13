import { Router } from 'express';
import { createReport, getMyReports, getReports, getReportStats, getReport, updateReportStatus, deleteReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// User endpoints
router.post('/', authenticate, createReport);
router.get('/mine', authenticate, getMyReports);

// Admin/moderator endpoints
router.get('/', authenticate, requireAdmin, getReports);
router.get('/stats', authenticate, requireAdmin, getReportStats);
router.get('/:id', authenticate, requireAdmin, getReport);
router.put('/:id', authenticate, requireAdmin, updateReportStatus);
router.delete('/:id', authenticate, requireAdmin, deleteReport);

export default router;
