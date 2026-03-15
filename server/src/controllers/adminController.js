import User from '../models/User.js';
import Pin from '../models/Pin.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/errors.js';
import { ok, paginated, message } from '../utils/response.js';

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Dashboard overview statistics
export const getAdminStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    activeUsersThisWeek,
    bannedUsers,
    totalPins,
    totalPosts,
    totalEvents,
    totalReviews,
    totalMessages,
    pendingReports,
    totalReports,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ updatedAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ isBanned: true }),
    Pin.countDocuments(),
    Post.countDocuments(),
    Event.countDocuments(),
    Review.countDocuments(),
    Message.countDocuments(),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments(),
  ]);

  // User growth — daily signups over last 30 days
  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  // Content created over last 30 days
  const contentGrowth = await Promise.all([
    Pin.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]),
    Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]),
  ]);

  // Role distribution
  const roleDistribution = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $project: { _id: 0, role: '$_id', count: 1 } },
  ]);

  return ok(res, {
    users: { total: totalUsers, newThisMonth: newUsersThisMonth, activeThisWeek: activeUsersThisWeek, banned: bannedUsers },
    content: { pins: totalPins, posts: totalPosts, events: totalEvents, reviews: totalReviews, messages: totalMessages },
    reports: { total: totalReports, pending: pendingReports },
    charts: { userGrowth, pinGrowth: contentGrowth[0], postGrowth: contentGrowth[1], roleDistribution },
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Paginated user list with search and filters
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, banned, sort = '-createdAt' } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role && role !== 'all') filter.role = role;
  if (banned === 'true') filter.isBanned = true;
  if (banned === 'false') filter.isBanned = { $ne: true };

  // Build sort object
  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortDir = sort.startsWith('-') ? -1 : 1;
  sortObj[sortField] = sortDir;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email avatar role isBanned bannedAt bannedReason isGuest isEmailVerified twoFactorEnabled createdAt updatedAt followers following')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  // Add computed fields
  const usersWithStats = users.map((u) => ({
    ...u,
    followersCount: u.followers?.length ?? 0,
    followingCount: u.following?.length ?? 0,
    followers: undefined,
    following: undefined,
  }));

  return paginated(res, usersWithStats, { page: pageNum, limit: limitNum, total });
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
// Detailed user view for admin
export const getUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshTokenHash -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
    .lean();

  if (!user) throw AppError.notFound('User not found');

  // Get user's content counts
  const [pinCount, postCount, eventCount, reviewCount, reportCount] = await Promise.all([
    Pin.countDocuments({ createdBy: user._id }),
    Post.countDocuments({ author: user._id }),
    Event.countDocuments({ organizer: user._id }),
    Review.countDocuments({ user: user._id }),
    Report.countDocuments({ reporter: user._id }),
  ]);

  return ok(res, {
    ...user,
    followersCount: user.followers?.length ?? 0,
    followingCount: user.following?.length ?? 0,
    stats: { pins: pinCount, posts: postCount, events: eventCount, reviews: reviewCount, reports: reportCount },
  });
});

// ─── PUT /api/admin/users/:id/role ────────────────────────────────────────────
// Update user role (superadmin only)
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'moderator'].includes(role)) {
    throw AppError.badRequest('Invalid role. Must be: user, admin, or moderator');
  }

  // Prevent self-demotion
  if (req.params.id === req.user._id.toString()) {
    throw AppError.badRequest('Cannot change your own role');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true },
  ).select('name email avatar role').lean();

  if (!user) throw AppError.notFound('User not found');
  return ok(res, user);
});

// ─── PUT /api/admin/users/:id/ban ─────────────────────────────────────────────
// Ban or unban a user
export const toggleBanUser = asyncHandler(async (req, res) => {
  const { banned, reason } = req.body;

  // Prevent self-ban
  if (req.params.id === req.user._id.toString()) {
    throw AppError.badRequest('Cannot ban yourself');
  }

  const target = await User.findById(req.params.id).select('role').lean();
  if (!target) throw AppError.notFound('User not found');

  // Prevent banning admins (only superadmin can ban moderators)
  if (target.role === 'admin') {
    throw AppError.badRequest('Cannot ban admin users');
  }
  if (target.role === 'moderator' && req.user.role !== 'admin') {
    throw AppError.badRequest('Only admins can ban moderators');
  }

  const update = banned
    ? { isBanned: true, bannedAt: new Date(), bannedReason: reason || '', bannedBy: req.user._id }
    : { isBanned: false, $unset: { bannedAt: 1, bannedReason: 1, bannedBy: 1 } };

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
    .select('name email avatar role isBanned bannedAt bannedReason')
    .lean();

  return ok(res, user);
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
// Delete user and their content (superadmin only)
export const deleteUserAdmin = asyncHandler(async (req, res) => {
  // Prevent self-deletion via admin route
  if (req.params.id === req.user._id.toString()) {
    throw AppError.badRequest('Cannot delete yourself via admin route');
  }

  const target = await User.findById(req.params.id).select('role').lean();
  if (!target) throw AppError.notFound('User not found');

  // Prevent deleting admins
  if (target.role === 'admin') {
    throw AppError.badRequest('Cannot delete admin users');
  }

  // Delete user's content in parallel
  await Promise.all([
    Pin.deleteMany({ createdBy: req.params.id }),
    Post.deleteMany({ author: req.params.id }),
    Event.deleteMany({ organizer: req.params.id }),
    Review.deleteMany({ user: req.params.id }),
    Report.deleteMany({ reporter: req.params.id }),
    // Remove from other users' followers/following lists
    User.updateMany(
      { $or: [{ followers: req.params.id }, { following: req.params.id }] },
      { $pull: { followers: req.params.id, following: req.params.id } },
    ),
    User.findByIdAndDelete(req.params.id),
  ]);

  return message(res, 'User and associated content deleted');
});

// ─── GET /api/admin/content ───────────────────────────────────────────────────
// Content moderation overview
export const getContentOverview = asyncHandler(async (req, res) => {
  const { type = 'all', page = 1, limit = 20, sort = '-createdAt' } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortDir = sort.startsWith('-') ? -1 : 1;
  sortObj[sortField] = sortDir;

  let data, total;

  switch (type) {
    case 'pins':
      [data, total] = await Promise.all([
        Pin.find().populate('createdBy', 'name avatar').sort(sortObj).skip(skip).limit(limitNum).lean(),
        Pin.countDocuments(),
      ]);
      break;
    case 'posts':
      [data, total] = await Promise.all([
        Post.find().populate('author', 'name avatar').sort(sortObj).skip(skip).limit(limitNum).lean(),
        Post.countDocuments(),
      ]);
      break;
    case 'events':
      [data, total] = await Promise.all([
        Event.find().populate('organizer', 'name avatar').sort(sortObj).skip(skip).limit(limitNum).lean(),
        Event.countDocuments(),
      ]);
      break;
    default: {
      // Return recent content of all types mixed
      const [pins, posts, events] = await Promise.all([
        Pin.find().populate('createdBy', 'name avatar').sort({ createdAt: -1 }).limit(10).lean(),
        Post.find().populate('author', 'name avatar').sort({ createdAt: -1 }).limit(10).lean(),
        Event.find().populate('organizer', 'name avatar').sort({ createdAt: -1 }).limit(10).lean(),
      ]);
      data = [
        ...pins.map((p) => ({ ...p, _type: 'pin' })),
        ...posts.map((p) => ({ ...p, _type: 'post' })),
        ...events.map((e) => ({ ...e, _type: 'event' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limitNum);
      total = data.length;
    }
  }

  return paginated(res, data, { page: pageNum, limit: limitNum, total });
});

// ─── DELETE /api/admin/content/:type/:id ──────────────────────────────────────
// Delete specific content by type and ID
export const deleteContent = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  let result;
  switch (type) {
    case 'pin':
      result = await Pin.findByIdAndDelete(id);
      break;
    case 'post':
      result = await Post.findByIdAndDelete(id);
      break;
    case 'event':
      result = await Event.findByIdAndDelete(id);
      break;
    case 'review':
      result = await Review.findByIdAndDelete(id);
      break;
    default:
      throw AppError.badRequest('Invalid content type. Must be: pin, post, event, or review');
  }

  if (!result) throw AppError.notFound(`${type} not found`);
  return message(res, `${type} deleted successfully`);
});
