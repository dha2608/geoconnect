import Report from '../models/Report.js';

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'targetType, targetId, and reason are required' });
    }

    // Prevent duplicate reports
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
    });

    if (existing) {
      return res.status(409).json({ message: 'You have already reported this content' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description: description?.slice(0, 500) || '',
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/reports/mine — user's own reports with status
export const getMyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find({ reporter: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments({ reporter: req.user._id }),
    ]);

    res.json({
      reports,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Admin endpoints ---

// GET /api/reports — list reports with filters (admin/moderator only)
export const getReports = async (req, res) => {
  try {
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

    res.json({
      reports,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/reports/stats — report statistics (admin/moderator only)
export const getReportStats = async (req, res) => {
  try {
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
    res.json({
      total: result.total[0]?.count || 0,
      byStatus: Object.fromEntries(result.byStatus.map(s => [s._id, s.count])),
      byType: Object.fromEntries(result.byType.map(t => [t._id, t.count])),
      byReason: Object.fromEntries(result.byReason.map(r => [r._id, r.count])),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/reports/:id — single report detail (admin/moderator only)
export const getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name avatar email');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/reports/:id — update report status (admin/moderator only)
export const updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: reviewed, resolved, or dismissed' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('reporter', 'name avatar email');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/reports/:id — delete a report (admin only)
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
