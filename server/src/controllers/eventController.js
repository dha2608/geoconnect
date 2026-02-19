import Event from '../models/Event.js';

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

export const createEvent = async (req, res) => {
  try {
    const { title, description, lat, lng, address, startTime, endTime, maxCapacity, isPublic, category } = req.body;
    
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
    
    const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('organizer', 'name avatar')
      .populate('attendees', 'name avatar');
    res.json(updated);
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
