/**
 * Centralized error codes and custom error class.
 *
 * Usage:
 *   throw new AppError(ERR.NOT_FOUND, 'Pin not found');
 *   throw AppError.badRequest('Missing lat/lng');
 *   throw AppError.unauthorized();
 */

// ─── Error Code Enum ──────────────────────────────────────────────────────────

export const ERR = Object.freeze({
  // 400 — Bad Request
  BAD_REQUEST:        { status: 400, code: 'BAD_REQUEST',        defaultMsg: 'Bad request' },
  VALIDATION_FAILED:  { status: 400, code: 'VALIDATION_FAILED',  defaultMsg: 'Validation failed' },
  DUPLICATE_ENTRY:    { status: 400, code: 'DUPLICATE_ENTRY',    defaultMsg: 'Resource already exists' },

  // 401 — Unauthorized
  UNAUTHORIZED:       { status: 401, code: 'UNAUTHORIZED',       defaultMsg: 'Authentication required' },
  INVALID_TOKEN:      { status: 401, code: 'INVALID_TOKEN',      defaultMsg: 'Invalid or expired token' },
  INVALID_CREDENTIALS:{ status: 401, code: 'INVALID_CREDENTIALS',defaultMsg: 'Invalid email or password' },

  // 403 — Forbidden
  FORBIDDEN:          { status: 403, code: 'FORBIDDEN',          defaultMsg: 'You do not have permission' },
  ACCOUNT_DISABLED:   { status: 403, code: 'ACCOUNT_DISABLED',   defaultMsg: 'Account is disabled' },

  // 404 — Not Found
  NOT_FOUND:          { status: 404, code: 'NOT_FOUND',          defaultMsg: 'Resource not found' },
  USER_NOT_FOUND:     { status: 404, code: 'USER_NOT_FOUND',     defaultMsg: 'User not found' },
  PIN_NOT_FOUND:      { status: 404, code: 'PIN_NOT_FOUND',      defaultMsg: 'Pin not found' },
  POST_NOT_FOUND:     { status: 404, code: 'POST_NOT_FOUND',     defaultMsg: 'Post not found' },
  EVENT_NOT_FOUND:    { status: 404, code: 'EVENT_NOT_FOUND',    defaultMsg: 'Event not found' },
  COMMENT_NOT_FOUND:  { status: 404, code: 'COMMENT_NOT_FOUND',  defaultMsg: 'Comment not found' },

  // 409 — Conflict
  CONFLICT:           { status: 409, code: 'CONFLICT',           defaultMsg: 'Conflict with current state' },

  // 429 — Rate Limited
  RATE_LIMITED:       { status: 429, code: 'RATE_LIMITED',       defaultMsg: 'Too many requests' },

  // 500 — Server Error
  INTERNAL:           { status: 500, code: 'INTERNAL_ERROR',     defaultMsg: 'Internal server error' },
});

// ─── AppError Class ───────────────────────────────────────────────────────────

export class AppError extends Error {
  /**
   * @param {{ status: number, code: string, defaultMsg: string }} errDef  One of the ERR.* constants
   * @param {string} [message]  Optional override for the default message
   * @param {object} [details]  Extra context (validation errors, field names, etc.)
   */
  constructor(errDef, message, details) {
    super(message || errDef.defaultMsg);
    this.name = 'AppError';
    this.status = errDef.status;
    this.code = errDef.code;
    this.details = details || null;
    Error.captureStackTrace(this, this.constructor);
  }

  /** Serialise for JSON response. */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }

  // ── Convenience factories ──────────────────────────────────────────────────

  static badRequest(msg, details) { return new AppError(ERR.BAD_REQUEST, msg, details); }
  static validationFailed(details) { return new AppError(ERR.VALIDATION_FAILED, undefined, details); }
  static unauthorized(msg) { return new AppError(ERR.UNAUTHORIZED, msg); }
  static forbidden(msg) { return new AppError(ERR.FORBIDDEN, msg); }
  static notFound(msg) { return new AppError(ERR.NOT_FOUND, msg); }
  static conflict(msg) { return new AppError(ERR.CONFLICT, msg); }
  static internal(msg) { return new AppError(ERR.INTERNAL, msg); }
}
