import Pin from '../models/Pin.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

// Maps each pin category to a representative emoji icon
const CATEGORY_ICONS = {
  food: '🍔',
  entertainment: '🎭',
  shopping: '🛍️',
  outdoors: '🌿',
  culture: '🏛️',
  travel: '✈️',
  sports: '⚽',
  health: '💊',
  education: '📚',
  other: '📍',
};

// Shared $lookup + $project stages to populate createdBy with safe public fields only
const createdByLookup = [
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'createdBy',
      pipeline: [
        { $project: { _id: 1, name: 1, avatar: 1 } },
      ],
    },
  },
  { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
];

// ─── GET /api/discover/recommended ───────────────────────────────────────────
// Returns personalised pins for authenticated users (category-matched + geo-sorted)
// or trending pins for anonymous users.
export const getRecommendedPins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;

  // ── Build per-user context ────────────────────────────────────────────────
  let matchFilter = { visibility: 'public' };
  let useGeoNear = false;
  let userCoords = null;

  if (req.user) {
    const user = await User.findById(req.user._id)
      .select('savedPins location')
      .populate('savedPins', 'category');

    const likedPins = await Pin.find({ likes: req.user._id }, 'category').lean();

    const savedPinIds = (user.savedPins || []).map((p) => p._id);
    const likedPinIds = likedPins.map((p) => p._id);
    const excludeIds = [...savedPinIds, ...likedPinIds];

    const savedCategories = (user.savedPins || [])
      .map((p) => p.category)
      .filter(Boolean);
    const likedCategories = likedPins.map((p) => p.category).filter(Boolean);
    const preferredCategories = [...new Set([...savedCategories, ...likedCategories])];

    if (preferredCategories.length > 0) {
      matchFilter = {
        visibility: 'public',
        category: { $in: preferredCategories },
        ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      };
    }

    // Enable geo-sorting when the user has stored coordinates
    // Filter out [0, 0] default coordinates (invalid/unset location)
    const coords = user.location?.coordinates;
    if (
      Array.isArray(coords) &&
      coords.length === 2 &&
      !(coords[0] === 0 && coords[1] === 0)
    ) {
      useGeoNear = true;
      userCoords = coords;
    }
  }

  // ── Run the aggregation ───────────────────────────────────────────────────
  let pins;
  let total;

  if (useGeoNear) {
    // $geoNear must be the first pipeline stage
    const geoNearStage = {
      $geoNear: {
        near: { type: 'Point', coordinates: userCoords },
        distanceField: 'distance',
        spherical: true,
        query: matchFilter,
        key: 'location',
      },
    };

    const [data, countResult] = await Promise.all([
      Pin.aggregate([geoNearStage, { $skip: skip }, { $limit: limit }, ...createdByLookup]),
      Pin.aggregate([geoNearStage, { $count: 'total' }]),
    ]);

    pins = data;
    total = countResult[0]?.total ?? 0;
  } else {
    // Fallback: sort by number of likes descending
    const pipeline = [
      { $match: matchFilter },
      { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $sort: { likesCount: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...createdByLookup,
    ];

    const [data, count] = await Promise.all([
      Pin.aggregate(pipeline),
      Pin.countDocuments(matchFilter),
    ]);

    pins = data;
    total = count;
  }

  return paginated(res, pins, { page, limit, total });
});

// ─── GET /api/discover/categories ────────────────────────────────────────────
// Returns pin counts grouped by category.
// If ?lat=&lng= are supplied, scopes results to a 50 km radius.
export const getPopularCategories = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const pipeline = [];

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const hasValidCoords =
    lat !== undefined &&
    lng !== undefined &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (hasValidCoords) {
    // Scope to 50 km radius via $geoNear (must be first stage)
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance: 50_000, // metres
        spherical: true,
        query: { visibility: 'public' },
      },
    });
  } else {
    pipeline.push({ $match: { visibility: 'public' } });
  }

  pipeline.push(
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
  );

  const results = await Pin.aggregate(pipeline);

  const data = results.map((r) => ({
    category: r.category,
    count: r.count,
    icon: CATEGORY_ICONS[r.category] ?? '📍',
  }));

  return ok(res, data);
});

// ─── GET /api/discover/feed ───────────────────────────────────────────────────
// Unified discovery feed: trending pins, upcoming events, active users, recent posts.
export const getDiscoverFeed = asyncHandler(async (req, res) => {
  const now = new Date();
  const currentUserId = req.user?._id ?? null;

  const [trendingPins, upcomingEvents, activeUsers, recentPosts] = await Promise.all([
    // Top 6 public pins by likes count
    Pin.aggregate([
      { $match: { visibility: 'public' } },
      { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $sort: { likesCount: -1 } },
      { $limit: 6 },
      ...createdByLookup,
    ]),

    // Top 4 upcoming events sorted by start time ascending
    Event.find({ startTime: { $gt: now }, isPublic: true })
      .sort({ startTime: 1 })
      .limit(4)
      .lean(),

    // Top 6 recently updated users, excluding the requesting user
    User.find(currentUserId ? { _id: { $ne: currentUserId } } : {})
      .sort({ updatedAt: -1 })
      .limit(6)
      .select('name avatar bio updatedAt')
      .lean(),

    // Top 6 recent posts that contain at least one image
    Post.find({ 'images.0': { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('author', 'name avatar')
      .lean(),
  ]);

  return ok(res, {
    sections: [
      { type: 'trending_pins', title: 'Trending Places', data: trendingPins },
      { type: 'upcoming_events', title: 'Upcoming Events', data: upcomingEvents },
      { type: 'active_users', title: 'Active People', data: activeUsers },
      { type: 'recent_posts', title: 'Recent Posts', data: recentPosts },
    ],
  });
});

// ─── GET /api/discover/people ─────────────────────────────────────────────────
// Suggests users to follow.
// Authenticated: friends-of-friends ranked by mutual count, then most-followed fallback.
// Anonymous: most-followed users.
export const getSuggestedUsers = asyncHandler(async (req, res) => {
  let users = [];

  if (req.user) {
    const currentUser = await User.findById(req.user._id).select('following');
    const alreadyFollowing = currentUser.following ?? [];

    // ── Friends-of-friends ─────────────────────────────────────────────────
    if (alreadyFollowing.length > 0) {
      const followingUsers = await User.find(
        { _id: { $in: alreadyFollowing } },
        'following',
      ).lean();

      // Count how many of my follows also follow each candidate
      const mutualCount = new Map();
      const alreadyFollowingSet = new Set(alreadyFollowing.map((id) => id.toString()));
      const currentUserIdStr = req.user._id.toString();

      for (const u of followingUsers) {
        for (const followedId of u.following ?? []) {
          const key = followedId.toString();
          if (key !== currentUserIdStr && !alreadyFollowingSet.has(key)) {
            mutualCount.set(key, (mutualCount.get(key) ?? 0) + 1);
          }
        }
      }

      if (mutualCount.size > 0) {
        const topIds = [...mutualCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id]) => id);

        const found = await User.find({ _id: { $in: topIds } })
          .select('name avatar bio')
          .lean();

        // Re-order by mutual count rank
        users = topIds
          .map((id) => found.find((u) => u._id.toString() === id))
          .filter(Boolean);
      }
    }

    // ── Fallback: most-followed (excluding self + already-following) ────────
    if (users.length === 0) {
      users = await User.aggregate([
        {
          $match: {
            _id: { $nin: [req.user._id, ...alreadyFollowing] },
          },
        },
        { $addFields: { followersCount: { $size: { $ifNull: ['$followers', []] } } } },
        { $sort: { followersCount: -1 } },
        { $limit: 10 },
        { $project: { name: 1, avatar: 1, bio: 1, followersCount: 1 } },
      ]);
    }
  } else {
    // Anonymous: just return most-followed users globally
    users = await User.aggregate([
      { $addFields: { followersCount: { $size: { $ifNull: ['$followers', []] } } } },
      { $sort: { followersCount: -1 } },
      { $limit: 10 },
      { $project: { name: 1, avatar: 1, bio: 1, followersCount: 1 } },
    ]);
  }

  return ok(res, { data: users });
});
