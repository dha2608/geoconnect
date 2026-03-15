import { body, param, query } from 'express-validator';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const mongoId = (field, location = param) =>
  location(field).isMongoId().withMessage(`${field} must be a valid ID`);

const passwordRule = (field = 'password') =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character');

const latRule = (required = true) => {
  const r = body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be a float between -90 and 90');
  return required ? r : r.optional();
};

const lngRule = (required = true) => {
  const r = body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be a float between -180 and 180');
  return required ? r : r.optional();
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const validateRegister = [
  body('name')
    .trim()
    .isString().withMessage('Name must be a string')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  passwordRule('password'),
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  passwordRule('newPassword'),
];

export const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
];

export const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  passwordRule('password'),
];

export const validateVerifyEmail = [
  body('token')
    .notEmpty().withMessage('Verification token is required'),
];

// ─── 2FA ──────────────────────────────────────────────────────────────────────

export const validate2FACode = [
  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
    .isNumeric().withMessage('Code must contain only numbers'),
];

export const validate2FALogin = [
  body('tempToken')
    .notEmpty().withMessage('Temp token is required'),
  body('code')
    .trim()
    .notEmpty().withMessage('2FA code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
    .isNumeric().withMessage('Code must contain only numbers'),
];

export const validate2FABackupLogin = [
  body('tempToken')
    .notEmpty().withMessage('Temp token is required'),
  body('backupCode')
    .trim()
    .notEmpty().withMessage('Backup code is required')
    .isLength({ min: 8, max: 8 }).withMessage('Backup code must be 8 characters'),
];

export const validate2FADisable = [
  body('password')
    .notEmpty().withMessage('Password is required to disable 2FA'),
];

export const validateDeleteAccount = [
  body('password')
    .optional()
    .isString().withMessage('Password must be a string'),
];

// ─── Posts ────────────────────────────────────────────────────────────────────

export const validateCreatePost = [
  // Accept both 'text' (API) and 'content' (client FormData) — controller resolves
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Text must be between 1 and 500 characters'),
  body('content')
    .optional()
    .trim()
    .isString().withMessage('Content must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Content must be between 1 and 500 characters'),
  body('lat')
    .optional()
    .isFloat().withMessage('lat must be a float'),
  body('lng')
    .optional()
    .isFloat().withMessage('lng must be a float'),
  body('address')
    .optional()
    .trim()
    .isString().withMessage('Address must be a string'),
  body('location')
    .optional()
    .isString().withMessage('Location must be a JSON string'),
  body('locationName')
    .optional()
    .trim()
    .isString().withMessage('Location name must be a string'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private']).withMessage('Visibility must be public, followers, or private'),
];

export const validateUpdatePost = [
  mongoId('id'),
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Text must be between 1 and 500 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private']).withMessage('Visibility must be public, followers, or private'),
];

export const validateHashtag = [
  param('tag')
    .trim()
    .isString().withMessage('Tag must be a string')
    .isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters'),
];

export const validateRepost = [
  mongoId('id'),
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ max: 500 }).withMessage('Text must be at most 500 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private']).withMessage('Visibility must be public, followers, or private'),
];

export const validateAddComment = [
  mongoId('id'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters'),
];

export const validateEditComment = [
  mongoId('id'),
  mongoId('commentId'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters'),
];

export const validateCommentId = [
  mongoId('id'),
  mongoId('commentId'),
];

export const validateReplyToComment = [
  mongoId('id'),
  mongoId('commentId'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Reply must be between 1 and 500 characters'),
];

export const validateReplyId = [
  mongoId('id'),
  mongoId('commentId'),
  mongoId('replyId'),
];

export const validateCommentReaction = [
  mongoId('id'),
  mongoId('commentId'),
  body('emoji')
    .notEmpty().withMessage('Emoji is required')
    .isString()
    .isLength({ max: 8 }).withMessage('Emoji too long'),
];

export const validatePostId = [
  mongoId('id'),
];

export const validateUserId = [
  mongoId('userId'),
];

// ─── Pins ─────────────────────────────────────────────────────────────────────

const PIN_CATEGORIES = ['food', 'entertainment', 'shopping', 'outdoors', 'culture', 'travel', 'sports', 'health', 'education', 'other'];

export const validateCreatePin = [
  body('title')
    .trim()
    .isString().withMessage('Title must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('category')
    .isIn(PIN_CATEGORIES).withMessage(`Category must be one of: ${PIN_CATEGORIES.join(', ')}`),
  latRule(true),
  lngRule(true),
  body('address')
    .optional()
    .trim()
    .isString().withMessage('Address must be a string'),
];

export const validateUpdatePin = [
  mongoId('id'),
  body('title')
    .optional()
    .trim()
    .isString().withMessage('Title must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('category')
    .optional()
    .isIn(PIN_CATEGORIES).withMessage(`Category must be one of: ${PIN_CATEGORIES.join(', ')}`),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be a float between -90 and 90'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be a float between -180 and 180'),
  body('address')
    .optional()
    .trim()
    .isString().withMessage('Address must be a string'),
];

export const validatePinId = [
  mongoId('id'),
];

// ─── Events ───────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = ['meetup', 'party', 'sports', 'music', 'food', 'other'];

export const validateCreateEvent = [
  body('title')
    .trim()
    .isString().withMessage('Title must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  latRule(true),
  lngRule(true),
  body('startTime')
    .isISO8601().withMessage('startTime must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('startTime must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601().withMessage('endTime must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('endTime must be after startTime');
      }
      return true;
    }),
  body('category')
    .isIn(EVENT_CATEGORIES).withMessage(`Category must be one of: ${EVENT_CATEGORIES.join(', ')}`),
  body('maxCapacity')
    .optional()
    .isInt({ min: 0 }).withMessage('maxCapacity must be a non-negative integer'),
  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array with max 10 items'),
  body('tags.*')
    .optional()
    .trim()
    .isString().withMessage('Each tag must be a string')
    .isLength({ min: 1, max: 30 }).withMessage('Each tag must be between 1 and 30 characters'),
  body('recurrence')
    .optional()
    .isObject().withMessage('Recurrence must be an object'),
  body('recurrence.type')
    .optional()
    .isIn(['none', 'daily', 'weekly', 'monthly']).withMessage('Recurrence type must be none, daily, weekly, or monthly'),
  body('recurrence.interval')
    .optional()
    .isInt({ min: 1, max: 52 }).withMessage('Recurrence interval must be between 1 and 52'),
  body('recurrence.endDate')
    .optional()
    .isISO8601().withMessage('Recurrence endDate must be a valid ISO 8601 date'),
  body('reminders')
    .optional()
    .isArray({ max: 5 }).withMessage('Reminders must be an array with max 5 items'),
  body('reminders.*.minutesBefore')
    .optional()
    .isInt({ min: 5, max: 10080 }).withMessage('minutesBefore must be between 5 and 10080 (1 week)'),
];

export const validateUpdateEvent = [
  mongoId('id'),
  body('title')
    .optional()
    .trim()
    .isString().withMessage('Title must be a string')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string')
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be a float between -90 and 90'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be a float between -180 and 180'),
  body('startTime')
    .optional()
    .isISO8601().withMessage('startTime must be a valid ISO 8601 date'),
  body('endTime')
    .optional()
    .isISO8601().withMessage('endTime must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('endTime must be after startTime');
      }
      return true;
    }),
  body('category')
    .optional()
    .isIn(EVENT_CATEGORIES).withMessage(`Category must be one of: ${EVENT_CATEGORIES.join(', ')}`),
  body('maxCapacity')
    .optional()
    .isInt({ min: 0 }).withMessage('maxCapacity must be a non-negative integer'),
  body('isPublic')
    .optional()
    .isBoolean().withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array with max 10 items'),
  body('tags.*')
    .optional()
    .trim()
    .isString().withMessage('Each tag must be a string')
    .isLength({ min: 1, max: 30 }).withMessage('Each tag must be between 1 and 30 characters'),
  body('reminders')
    .optional()
    .isArray({ max: 5 }).withMessage('Reminders must be an array with max 5 items'),
  body('reminders.*.minutesBefore')
    .optional()
    .isInt({ min: 5, max: 10080 }).withMessage('minutesBefore must be between 5 and 10080 (1 week)'),
];

export const validateEventId = [
  mongoId('id'),
];

export const validateEventComment = [
  mongoId('id'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters'),
];

export const validateEditEventComment = [
  mongoId('id'),
  mongoId('commentId'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters'),
];

export const validateEventCommentId = [
  mongoId('id'),
  mongoId('commentId'),
];

export const validateEventTag = [
  param('tag')
    .trim()
    .isString().withMessage('Tag must be a string')
    .isLength({ min: 1, max: 50 }).withMessage('Tag must be between 1 and 50 characters'),
];

// ─── Users ────────────────────────────────────────────────────────────────────

export const validateUpdateMe = [
  body('name')
    .optional()
    .trim()
    .isString().withMessage('Name must be a string')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isString().withMessage('Bio must be a string')
    .isLength({ max: 200 }).withMessage('Bio must not exceed 200 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
];

export const validateUpdateLocation = [
  body('lat')
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be a float between -90 and 90'),
  body('lng')
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be a float between -180 and 180'),
];

export const validateGetNearbyUsers = [
  query('lat')
    .isFloat().withMessage('lat must be a float'),
  query('lng')
    .isFloat().withMessage('lng must be a float'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 }).withMessage('radius must be an integer between 100 and 50000'),
];

export const validateUpdateSettings = [
  body('privacy')
    .optional()
    .isObject().withMessage('privacy must be an object'),
  body('privacy.shareLocation')
    .optional()
    .isBoolean().withMessage('privacy.shareLocation must be a boolean'),
  body('privacy.nearbyDiscovery')
    .optional()
    .isBoolean().withMessage('privacy.nearbyDiscovery must be a boolean'),
  body('privacy.publicProfile')
    .optional()
    .isBoolean().withMessage('privacy.publicProfile must be a boolean'),
  body('notifications')
    .optional()
    .isObject().withMessage('notifications must be an object'),
  body('notifications.push')
    .optional()
    .isBoolean().withMessage('notifications.push must be a boolean'),
  body('notifications.email')
    .optional()
    .isBoolean().withMessage('notifications.email must be a boolean'),
  body('notifications.newFollower')
    .optional()
    .isBoolean().withMessage('notifications.newFollower must be a boolean'),
  body('notifications.nearbyEvent')
    .optional()
    .isBoolean().withMessage('notifications.nearbyEvent must be a boolean'),
  body('appearance')
    .optional()
    .isObject().withMessage('appearance must be an object'),
  body('appearance.mapStyle')
    .optional()
    .isIn(['dark', 'street', 'light', 'satellite']).withMessage('appearance.mapStyle must be one of: dark, street, light, satellite'),
  body('appearance.distanceUnit')
    .optional()
    .isIn(['km', 'miles']).withMessage('appearance.distanceUnit must be km or miles'),
];

export const validateUserParamId = [
  mongoId('id'),
];

// ─── Messages ─────────────────────────────────────────────────────────────────

export const validateSendMessage = [
  mongoId('conversationId'),
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ max: 1000 }).withMessage('Message text must be at most 1000 characters'),
];

export const validateCreateConversation = [
  body('recipientId')
    .notEmpty().withMessage('recipientId is required')
    .isMongoId().withMessage('recipientId must be a valid ID'),
];

export const validateConversationId = [
  mongoId('conversationId'),
];

export const validateEditMessage = [
  mongoId('messageId'),
  body('text')
    .trim()
    .isString().withMessage('Text must be a string')
    .isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
];

export const validateMessageReaction = [
  mongoId('messageId'),
  body('emoji')
    .notEmpty().withMessage('Emoji is required')
    .isString().withMessage('Emoji must be a string')
    .isLength({ max: 8 }).withMessage('Emoji must be at most 8 characters'),
];

export const validateMessageId = [
  mongoId('messageId'),
];

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const validateCreateReview = [
  mongoId('pinId'),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Review text must be a string')
    .isLength({ max: 500 }).withMessage('Review text must not exceed 500 characters'),
];

export const validateUpdateReview = [
  mongoId('pinId'),
  mongoId('reviewId'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  body('text')
    .optional()
    .trim()
    .isString().withMessage('Review text must be a string')
    .isLength({ max: 500 }).withMessage('Review text must not exceed 500 characters'),
];

export const validateReviewParams = [
  mongoId('pinId'),
  mongoId('reviewId'),
];

export const validatePinIdParam = [
  mongoId('pinId'),
];

export const validateReviewResponse = [
  mongoId('pinId'),
  mongoId('reviewId'),
  body('text')
    .trim()
    .notEmpty().withMessage('Response text is required')
    .isLength({ max: 500 }).withMessage('Response must not exceed 500 characters'),
];

// ─── Geocode ──────────────────────────────────────────────────────────────────

export const validateSearchGeocode = [
  query('q')
    .trim()
    .isString().withMessage('Search query must be a string')
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
];

export const validateReverseGeocode = [
  query('lat')
    .isFloat().withMessage('lat must be a float'),
  query('lng')
    .isFloat().withMessage('lng must be a float'),
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const validateNotificationId = [
  mongoId('id'),
];

// ─── Shared Search ────────────────────────────────────────────────────────────

export const validateSearchQuery = [
  query('q')
    .trim()
    .isString().withMessage('Search query must be a string')
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
];
