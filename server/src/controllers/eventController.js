import Event from '../models/Event.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { createNotification } from '../utils/createNotification.js';

export const getEventsByViewport = async (req, res) => {
  try {
    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ message: 'Viewport bounds required' });
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
    }).populate('organizer', 'name avatar').sort({ startTime: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const events = await Event.find({
      isPublic: true,
      startTime: { $gte: new Date() },
    })
      .sort({ startTime: 1 })
      .limit(parseInt(limit))
      .populate('organizer', 'name avatar');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch upcoming events' });
  }
};

export const createEvent = async (req, res) => {
  try {
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
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name avatar')
      .populate('attendees', 'name avatar');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    if (event.maxCapacity > 0 && event.attendees.length >= event.maxCapacity) {
      return res.status(400).json({ message: 'Event is full' });
    }
    
    await Event.findByIdAndUpdate(req.params.id, { $addToSet: { attendees: req.user._id } });

    // Notify event organizer
    await createNotification(req, {
      recipientId: event.organizer,
      senderId: req.user._id,
      type: 'rsvp',
      data: { eventId: event._id, eventTitle: event.title },
    });

    res.json({ message: 'RSVP successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const cancelRsvp = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { $pull: { attendees: req.user._id } });
    res.json({ message: 'RSVP cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
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
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchEvents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters' });

    const regex = { $regex: q, $options: 'i' };
    const events = await Event.find({
      isPublic: true,
      endTime: { $gte: new Date() },
      $or: [
        { title: regex },
        { description: regex },
        { address: regex },
      ],
    })
      .populate('organizer', 'name avatar')
      .sort({ startTime: 1 })
      .limit(20);

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
