import Report from '../models/Report.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;

  if (!targetType || !targetId || !reason) {
    throw AppError.badRequest('targetType, targetId, and reason are required');
  }

  // Prevent duplicate reports
  const existing = await Report.findOne({
    reporter: req.user._id,
    targetType,
    targetId,
  });

  if (existing) {
    throw new AppError(ERR.CONFLICT, 'You have already reported this content');
  }

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    reason,
    description: description?.slice(0, 500) || '',
  });

  return created(res, report);
});

// GET /api/reports/mine — user's own reports with status
export const getMyReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reports, total] = await Promise.all([
    Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Report.countDocuments({ reporter: req.user._id }),
  ]);

  return paginated(res, reports, { page: parseInt(page), limit: parseInt(limit), total });
});

// --- Admin endpoints ---

// GET /api/reports — list reports with filters (admin/moderator only)
export const getReports = asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 20, targetType } = req.query;
  const filter = {};
  if (status !== 'all') filter.status = status;
  if (targetType) filter.targetType = targetType;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reporter', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Report.countDocuments(filter),
  ]);

  return paginated(res, reports, { page: parseInt(page), limit: parseInt(limit), total });
});

// GET /api/reports/stats — report statistics (admin/moderator only)
export const getReportStats = asyncHandler(async (req, res) => {
  const stats = await Report.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byType: [{ $group: { _id: '$targetType', count: { $sum: 1 } } }],
        byReason: [{ $group: { _id: '$reason', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const result = stats[0];
  return ok(res, {
    total: result.total[0]?.count || 0,
    byStatus: Object.fromEntries(result.byStatus.map(s => [s._id, s.count])),
    byType: Object.fromEntries(result.byType.map(t => [t._id, t.count])),
    byReason: Object.fromEntries(result.byReason.map(r => [r._id, r.count])),
  });
});

// GET /api/reports/:id — single report detail (admin/moderator only)
export const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporter', 'name avatar email');
  if (!report) throw AppError.notFound('Report not found');
  return ok(res, report);
});

// PUT /api/reports/:id — update report status (admin/moderator only)
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
    throw AppError.badRequest('Invalid status. Must be: reviewed, resolved, or dismissed');
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('reporter', 'name avatar email');

  if (!report) throw AppError.notFound('Report not found');
  return ok(res, report);
});

// DELETE /api/reports/:id — delete a report (admin only)
export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) throw AppError.notFound('Report not found');
  return message(res, 'Report deleted');
});
