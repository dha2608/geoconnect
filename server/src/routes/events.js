import { Router } from 'express';
import { getEventsByViewport, getUpcomingEvents, searchEvents, createEvent, getEvent, rsvpEvent, cancelRsvp, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { validateCreateEvent, validateUpdateEvent, validateEventId, validateSearchQuery } from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

router.get('/', optionalAuth, paginate, getEventsByViewport);
router.get('/upcoming', optionalAuth, paginate, getUpcomingEvents);
router.get('/search', optionalAuth, validateSearchQuery, validate, paginate, searchEvents);
router.post('/', authenticate, upload.single('coverImage'), validateCreateEvent, validate, createEvent);
router.get('/:id', optionalAuth, validateEventId, validate, getEvent);
router.put('/:id', authenticate, upload.single('coverImage'), validateUpdateEvent, validate, updateEvent);
router.delete('/:id', authenticate, validateEventId, validate, deleteEvent);
router.post('/:id/rsvp', authenticate, validateEventId, validate, rsvpEvent);
router.delete('/:id/rsvp', authenticate, validateEventId, validate, cancelRsvp);

export default router;
