import Event from '../models/Event.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';

export const getEventsByViewport = asyncHandler(async (req, res) => {
  const { swLat, swLng, neLat, neLng } = req.query;
  if (!swLat || !swLng || !neLat || !neLng) {
    throw AppError.badRequest('Viewport bounds required');
  }

  const events = await Event.find({
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
  })
    .populate('organizer', 'name avatar')
    .sort({ startTime: 1 })
    .limit(req.pagination.limit);

  return ok(res, events);
});

export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = req.pagination;
  const filter = { isPublic: true, startTime: { $gte: new Date() } };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name avatar'),
    Event.countDocuments(filter),
  ]);

  return paginated(res, events, { page, limit, total });
});

export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, lat, lng, address, startTime, endTime, maxCapacity, isPublic, category } = req.body;

  let coverImage = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/events');
    coverImage = result.secure_url;
  }

  const event = await Event.create({
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
  });

  const populated = await event.populate('organizer', 'name avatar');
  return created(res, populated);
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name avatar')
    .populate('attendees', 'name avatar');
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);
  return ok(res, event);
});

export const rsvpEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);

  if (event.maxCapacity > 0 && event.attendees.length >= event.maxCapacity) {
    throw AppError.badRequest('Event is full');
  }

  await Event.findByIdAndUpdate(req.params.id, { $addToSet: { attendees: req.user._id } });

  // Notify event organizer
  await createNotification(req, {
    recipientId: event.organizer,
    senderId: req.user._id,
    type: 'rsvp',
    data: { eventId: event._id, eventTitle: event.title },
  });

  return message(res, 'RSVP successful');
});

export const cancelRsvp = asyncHandler(async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, { $pull: { attendees: req.user._id } });
  return message(res, 'RSVP cancelled');
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
  // Handle cover image upload on update
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'geoconnect/events');
    updates.coverImage = result.secure_url;
  }

  const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('organizer', 'name avatar')
    .populate('attendees', 'name avatar');
  return ok(res, updated);
});

export const searchEvents = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

  const { page, limit, skip } = req.pagination;
  const baseFilter = { isPublic: true, endTime: { $gte: new Date() } };

  let query;
  let projection = {};
  let sortOpts = { startTime: 1 };

  if (q.length >= 3) {
    // Use MongoDB text index for relevance-ranked search
    query = { ...baseFilter, $text: { $search: q } };
    projection = { score: { $meta: 'textScore' } };
    sortOpts = { score: { $meta: 'textScore' } };
  } else {
    // Fallback to regex for very short queries
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
      .limit(limit),
    Event.countDocuments(query),
  ]);

  return paginated(res, events, { page, limit, total });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new AppError(ERR.EVENT_NOT_FOUND);
  if (event.organizer.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  await event.deleteOne();
  return message(res, 'Event deleted');
});
