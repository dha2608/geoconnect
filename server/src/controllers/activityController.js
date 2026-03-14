import Pin from '../models/Pin.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

/* ─────────────────────────────────────────────────────────────────────────────
 * GET /users/me/activity/stats
 * Returns aggregated activity counts for the authenticated user.
 * ───────────────────────────────────────────────────────────────────────────── */
export const getActivityStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).lean();

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [
    pinsCreated,
    postsCreated,
    eventsCreated,
    reviewsWritten,
    checkInsAgg,
    likesGivenAgg,
  ] = await Promise.all([
    // Pins created by user
    Pin.countDocuments({ createdBy: userId }),

    // Posts authored by user
    Post.countDocuments({ author: userId }),

    // Events organized by user (model uses 'organizer' field)
    Event.countDocuments({ organizer: userId }),

    // Reviews written by user
    Review.countDocuments({ user: userId }),

    // Check-ins the user has performed (across all pins)
    Pin.aggregate([
      { $match: { 'checkIns.user': userObjectId } },
      { $unwind: '$checkIns' },
      { $match: { 'checkIns.user': userObjectId } },
      { $count: 'total' },
    ]),

    // Likes the user has given to any pin
    Pin.aggregate([
      { $match: { likes: userObjectId } },
      { $count: 'total' },
    ]),
  ]);

  const checkIns = checkInsAgg[0]?.total ?? 0;
  const likesGiven = likesGivenAgg[0]?.total ?? 0;

  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return ok(res, {
    stats: {
      pinsCreated,
      postsCreated,
      eventsCreated,
      reviewsWritten,
      checkIns,
      likesGiven,
      followers: user.followers?.length ?? 0,
      following: user.following?.length ?? 0,
      daysSinceJoined,
      joinDate: user.createdAt,
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * GET /users/me/activity/recent
 * Returns recent pins, posts, and events merged and sorted by date.
 * ───────────────────────────────────────────────────────────────────────────── */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit, 10) || 20;

  const [pins, posts, events] = await Promise.all([
    Pin.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description category address images createdAt likes checkIns')
      .lean(),

    Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('text images address createdAt likes comments')
      .lean(),

    Event.find({ organizer: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title description category address coverImage startTime createdAt attendees')
      .lean(),
  ]);

  const activities = [
    ...pins.map((p) => ({ ...p, type: 'pin' })),
    ...posts.map((p) => ({ ...p, type: 'post' })),
    ...events.map((e) => ({ ...e, type: 'event' })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return ok(res, { activities });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * GET /users/me/activity/heatmap
 * Returns daily content-creation counts for the last 365 days.
 * ───────────────────────────────────────────────────────────────────────────── */
export const getActivityHeatmap = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  // Fetch only creation dates; project is minimal for performance
  const [pinDates, postDates, eventDates] = await Promise.all([
    Pin.find(
      { createdBy: userId, createdAt: { $gte: oneYearAgo } },
      { createdAt: 1 }
    ).lean(),

    Post.find(
      { author: userId, createdAt: { $gte: oneYearAgo } },
      { createdAt: 1 }
    ).lean(),

    Event.find(
      { organizer: userId, createdAt: { $gte: oneYearAgo } },
      { createdAt: 1 }
    ).lean(),
  ]);

  // Group all dates into a YYYY-MM-DD → count map
  const countByDate = {};
  for (const item of [...pinDates, ...postDates, ...eventDates]) {
    // Use UTC date string to avoid timezone shifting across day boundaries
    const date = new Date(item.createdAt).toISOString().slice(0, 10);
    countByDate[date] = (countByDate[date] || 0) + 1;
  }

  const heatmap = Object.entries(countByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return ok(res, { heatmap });
});
