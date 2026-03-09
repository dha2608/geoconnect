import { Router } from 'express';
import { getEventsByViewport, getUpcomingEvents, createEvent, getEvent, rsvpEvent, cancelRsvp, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getEventsByViewport);
router.get('/upcoming', optionalAuth, getUpcomingEvents);
router.post('/', authenticate, createEvent);
router.get('/:id', optionalAuth, getEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);
router.post('/:id/rsvp', authenticate, rsvpEvent);
router.delete('/:id/rsvp', authenticate, cancelRsvp);

export default router;
