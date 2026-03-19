import Event from '../models/Event.js';
import Comment from '../models/Comment.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';
import { awardXP, incrementDailyChallenge } from '../services/xpService.js';
import { checkAchievements } from '../services/achievementChecker.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractTags(text) {
  if (!text) return [];
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  if (!matches) return [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

function generateRecurringDates(startTime, endTime, recurrence) {
  const dates = [];
  if (!recurrence || recurrence.type === 'none') return dates;

  const duration = endTime.getTime() - startTime.getTime();
  const endDate = recurrence.endDate ? new Date(recurrence.endDate) : new Date(startTime.getTime() + 365 * 24 * 60 * 60 * 1000);
  const interval = recurrence.interval || 1;
  const maxInstances = 52; // safety cap

  let current = new Date(startTime);

  for (let i = 0; i < maxInstances; i++) {
    // Advance to next occurrence
    if (recurrence.type === 'daily') {
      current = new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
    } else if (recurrence.type === 'weekly') {
      current = new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    } else if (recurrence.type === 'monthly') {
      const next = new Date(current);
      next.setMonth(next.getMonth() + interval);
      current = next;
    }

    if (current > endDate) break;

    dates.push({
      startTime: new Date(current),
      endTime: new Date(current.getTime() + duration),
    });
  }

  return dates;
}

// ─── Viewport & Listing ─────────────────────────────────────────────────────

export const getEventsByViewport = asyncHandler(async (req, res) => {
  const { swLat, swLng, neLat, neLng, tags, category } = req.query;
  if (!swLat || !swLng || !neLat || !neLng) {
    throw AppError.badRequest('Viewport bounds required');
  }

  const filter = {
    isPublic: true,
    endTime: { $gte: new Date() },
    location: {
      $geoWithin: {
        $box: [
          [parseFloat(swLng), parseFloat(swLat)],
          [parseFloat(neLng), parseFloat(neLat)],
        ],
      },
    },
  };

  if (tags) {
    const tagArr = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tagArr.length) filter.tags = { $in: tagArr };
  }
  if (category && category !== 'all') {
    filter.category = category;
  }

  const events = await Event.find(filter)
    .populate('organizer', 'name avatar')
    .sort({ startTime: 1 })
    .limit(req.pagination.limit)
    .lean();

  return ok(res, events);
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const { tags, category, startDate, endDate } = req.query;

  const filter = { isPublic: true, startTime: { $gte: new Date() } };

  if (tags) {
    const tagArr = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tagArr.length) filter.tags = { $in: tagArr };
  }
  if (category && category !== 'all') {
    filter.category = category;
  }
  if (startDate) {
    filter.startTime.$gte = new Date(startDate);
  }
  if (endDate) {
    filter.startTime.$lte = new Date(endDate);
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean(),
    Event.countDocuments(filter),
  ]);

  return paginated(res, events, { page, limit, total });
});

// ─── CRUD ───────────────────────────────────────────────────────────────────

export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, lat, lng, address, startTime, endTime, maxCapacity, isPublic, category, tags, recurrence, reminders } = req.body;

  let coverImage = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/events');
    coverImage = result.secure_url;
  }

  // Parse tags from description + explicit tags
  const descTags = extractTags(description);
  const explicitTags = Array.isArray(tags) ? tags.map((t) => t.toLowerCase().trim()) : [];
  const allTags = [...new Set([...descTags, ...explicitTags])].slice(0, 10);

  // Parse recurrence
  const parsedRecurrence = recurrence ? (typeof recurrence === 'string' ? JSON.parse(recurrence) : recurrence) : { type: 'none' };

  // Parse reminders (default: 1 hour before)
  let parsedReminders = [{ minutesBefore: 60 }];
  if (reminders) {
    const rem = typeof reminders === 'string' ? JSON.parse(reminders) : reminders;
    if (Array.isArray(rem) && rem.length > 0) {
      parsedReminders = rem.slice(0, 5).map((r) => ({ minutesBefore: Number(r.minutesBefore) || 60 }));
    }
  }

  const eventData = {
    title,
    description,
    location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    address,
    startTime,
    endTime,
    organizer: req.user._id,
    maxCapacity: maxCapacity || 0,
    isPublic: isPublic !== false,
    category,
    coverImage,
    tags: allTags,
    recurrence: parsedRecurrence,
    reminders: parsedReminders,
  };

  const event = await Event.create(eventData);

  // Generate recurring instances if applicable
  if (parsedRecurrence.type !== 'none') {
    const dates = generateRecurringDates(new Date(startTime), new Date(endTime), parsedRecurrence);
    if (dates.length > 0) {
      const childEvents = dates.map((d) => ({
        ...eventData,
        startTime: d.startTime,
        endTime: d.endTime,
        parentEvent: event._id,
        recurrence: { type: 'none' },
        attendees: [],
      }));
      await Event.insertMany(childEvents);
    }
  }

  const populated = await event.populate('organizer', 'name avatar');
  return created(res, populated);
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name avatar')
    .populate('attendees', 'name avatar')
    .populate('parentEvent', 'title startTime')
    .lean();
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);
  return ok(res, event);
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);
  if (event.organizer.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const allowedFields = ['title', 'description', 'address', 'startTime', 'endTime', 'maxCapacity', 'isPublic', 'category'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (req.body.lat && req.body.lng) {
    updates.location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] };
  }
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/events');
    updates.coverImage = result.secure_url;
  }

  // Handle tags
  if (req.body.tags !== undefined) {
    const explicit = Array.isArray(req.body.tags) ? req.body.tags : [];
    const descTags = extractTags(updates.description || event.description);
    updates.tags = [...new Set([...descTags, ...explicit.map((t) => t.toLowerCase().trim())])].slice(0, 10);
  }

  // Handle reminders
  if (req.body.reminders !== undefined) {
    const rem = typeof req.body.reminders === 'string' ? JSON.parse(req.body.reminders) : req.body.reminders;
    if (Array.isArray(rem)) {
      updates.reminders = rem.slice(0, 5).map((r) => ({ minutesBefore: Number(r.minutesBefore) || 60 }));
    }
  }

  const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('organizer', 'name avatar')
    .populate('attendees', 'name avatar');
  return ok(res, updated);
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);
  if (event.organizer.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  // Delete child recurring events
  await Event.deleteMany({ parentEvent: event._id });
  // Delete event comments
  await Comment.deleteMany({ event: event._id });
  await event.deleteOne();
  return message(res, 'Event deleted');
});

// ─── RSVP ───────────────────────────────────────────────────────────────────

export const rsvpEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);

  if (event.maxCapacity > 0 && event.attendees.length >= event.maxCapacity) {
    throw AppError.badRequest('Event is full');
  }

  await Event.findByIdAndUpdate(req.params.id, { $addToSet: { attendees: req.user._id } });

  await createNotification(req, {
    recipientId: event.organizer,
    senderId: req.user._id,
    type: 'rsvp',
    data: { eventId: event._id, eventTitle: event.title },
  });

  // Gamification: award XP for event attendance (fire-and-forget)
  awardXP(req.user._id, 'EVENT_ATTEND', { eventId: event._id }).catch((err) => console.error('[Gamification] awardXP EVENT_ATTEND failed:', err.message));
  incrementDailyChallenge(req.user._id, 'attend_event').catch((err) => console.error('[Gamification] incrementDailyChallenge attend_event failed:', err.message));
  checkAchievements(req.user._id, 'EVENT_ATTEND').catch((err) => console.error('[Gamification] checkAchievements EVENT_ATTEND failed:', err.message));

  return message(res, 'RSVP successful');
});

export const cancelRsvp = asyncHandler(async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, { $pull: { attendees: req.user._id } });
  return message(res, 'RSVP cancelled');
});

// ─── Search ─────────────────────────────────────────────────────────────────

export const searchEvents = asyncHandler(async (req, res) => {
  const { q, tags, category, startDate, endDate } = req.query;
  if (!q || q.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

  const { page, limit, skip } = req.pagination;
  const baseFilter = { isPublic: true, endTime: { $gte: new Date() } };

  // Tag filter
  if (tags) {
    const tagArr = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tagArr.length) baseFilter.tags = { $in: tagArr };
  }
  if (category && category !== 'all') {
    baseFilter.category = category;
  }
  if (startDate) {
    baseFilter.startTime = { ...baseFilter.startTime, $gte: new Date(startDate) };
  }
  if (endDate) {
    baseFilter.startTime = { ...baseFilter.startTime, $lte: new Date(endDate) };
  }

  let query;
  let projection = {};
  let sortOpts = { startTime: 1 };

  if (q.length >= 3) {
    query = { ...baseFilter, $text: { $search: q } };
    projection = { score: { $meta: 'textScore' } };
    sortOpts = { score: { $meta: 'textScore' } };
  } else {
    const regex = { $regex: q, $options: 'i' };
    query = {
      ...baseFilter,
      $or: [{ title: regex }, { description: regex }, { address: regex }],
    };
  }

  const [events, total] = await Promise.all([
    Event.find(query, projection)
      .populate('organizer', 'name avatar')
      .sort(sortOpts)
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(query),
  ]);

  return paginated(res, events, { page, limit, total });
});

// ─── Recurring ──────────────────────────────────────────────────────────────

export const getRecurringInstances = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;

  const [events, total] = await Promise.all([
    Event.find({ parentEvent: req.params.id, startTime: { $gte: new Date() } })
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean(),
    Event.countDocuments({ parentEvent: req.params.id, startTime: { $gte: new Date() } }),
  ]);

  return paginated(res, events, { page, limit, total });
});

// ─── Tags ───────────────────────────────────────────────────────────────────

export const getEventsByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const { page, limit, skip } = req.pagination;

  const filter = {
    isPublic: true,
    endTime: { $gte: new Date() },
    tags: tag.toLowerCase(),
  };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar')
      .lean(),
    Event.countDocuments(filter),
  ]);

  return paginated(res, events, { page, limit, total });
});

export const getPopularTags = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const tags = await Event.aggregate([
    { $match: { isPublic: true, endTime: { $gte: new Date() }, tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { tag: '$_id', count: 1, _id: 0 } },
  ]);

  return ok(res, tags);
});

// ─── Event Comments ─────────────────────────────────────────────────────────

export const getEventComments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;

  const [comments, total] = await Promise.all([
    Comment.find({ event: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('likes', '_id')
      .lean(),
    Comment.countDocuments({ event: req.params.id }),
  ]);

  return paginated(res, comments, { page, limit, total });
});

export const addEventComment = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);

  const comment = await Comment.create({
    event: req.params.id,
    user: req.user._id,
    text: req.body.text,
  });

  await Event.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });

  const populated = await comment.populate('user', 'name avatar');

  // Notify event organizer
  if (event.organizer.toString() !== req.user._id.toString()) {
    await createNotification(req, {
      recipientId: event.organizer,
      senderId: req.user._id,
      type: 'comment',
      data: { eventId: event._id, eventTitle: event.title, commentText: req.body.text.slice(0, 100) },
    });
  }

  return created(res, populated);
});

export const editEventComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw AppError.notFound('Comment not found');
  if (comment.user.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  comment.text = req.body.text;
  comment.isEdited = true;
  await comment.save();

  const populated = await comment.populate('user', 'name avatar');
  return ok(res, populated);
});

export const deleteEventComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw AppError.notFound('Comment not found');

  const event = await Event.findById(req.params.id);

  // Allow comment author or event organizer to delete
  const isAuthor = comment.user.toString() === req.user._id.toString();
  const isOrganizer = event && event.organizer.toString() === req.user._id.toString();
  if (!isAuthor && !isOrganizer) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  await comment.deleteOne();
  await Event.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } });

  return noContent(res);
});

export const likeEventComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { $addToSet: { likes: req.user._id } },
    { new: true },
  ).populate('user', 'name avatar');

  if (!comment) throw AppError.notFound('Comment not found');

  // Notify comment author
  if (comment.user._id.toString() !== req.user._id.toString()) {
    await createNotification(req, {
      recipientId: comment.user._id,
      senderId: req.user._id,
      type: 'like',
      data: { commentId: comment._id, commentText: comment.text.slice(0, 100) },
    });
  }

  return ok(res, comment);
});

export const unlikeEventComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { $pull: { likes: req.user._id } },
    { new: true },
  ).populate('user', 'name avatar');

  if (!comment) throw AppError.notFound('Comment not found');
  return ok(res, comment);
});
