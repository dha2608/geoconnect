import { Router } from 'express';
import {
  getEventsByViewport, getUpcomingEvents, searchEvents, createEvent,
  getEvent, rsvpEvent, cancelRsvp, updateEvent, deleteEvent,
  getRecurringInstances, getEventsByTag, getPopularTags,
  getEventComments, addEventComment, editEventComment, deleteEventComment,
  likeEventComment, unlikeEventComment,
} from '../controllers/eventController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  validateCreateEvent, validateUpdateEvent, validateEventId,
  validateSearchQuery, validateEventComment, validateEditEventComment,
  validateEventCommentId, validateEventTag,
} from '../validators/index.js';
import { paginate } from '../middleware/pagination.js';

const router = Router();

// ─── Core Event Routes ────────────────────────────────────────────────────────
router.get('/', optionalAuth, paginate, getEventsByViewport);
router.get('/upcoming', optionalAuth, paginate, getUpcomingEvents);
router.get('/search', optionalAuth, validateSearchQuery, validate, paginate, searchEvents);
router.post('/', authenticate, upload.single('coverImage'), validateCreateEvent, validate, createEvent);

// ─── Tags ─────────────────────────────────────────────────────────────────────
router.get('/tags/popular', optionalAuth, getPopularTags);
router.get('/tags/:tag', optionalAuth, validateEventTag, validate, paginate, getEventsByTag);

// ─── Single Event ─────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, validateEventId, validate, getEvent);
router.put('/:id', authenticate, upload.single('coverImage'), validateUpdateEvent, validate, updateEvent);
router.delete('/:id', authenticate, validateEventId, validate, deleteEvent);

// ─── RSVP ─────────────────────────────────────────────────────────────────────
router.post('/:id/rsvp', authenticate, validateEventId, validate, rsvpEvent);
router.delete('/:id/rsvp', authenticate, validateEventId, validate, cancelRsvp);

// ─── Recurring Instances ──────────────────────────────────────────────────────
router.get('/:id/recurring', optionalAuth, validateEventId, validate, paginate, getRecurringInstances);

// ─── Event Comments ───────────────────────────────────────────────────────────
router.get('/:id/comments', optionalAuth, validateEventId, validate, paginate, getEventComments);
router.post('/:id/comments', authenticate, validateEventComment, validate, addEventComment);
router.put('/:id/comments/:commentId', authenticate, validateEditEventComment, validate, editEventComment);
router.delete('/:id/comments/:commentId', authenticate, validateEventCommentId, validate, deleteEventComment);
router.post('/:id/comments/:commentId/like', authenticate, validateEventCommentId, validate, likeEventComment);
router.delete('/:id/comments/:commentId/like', authenticate, validateEventCommentId, validate, unlikeEventComment);

export default router;
