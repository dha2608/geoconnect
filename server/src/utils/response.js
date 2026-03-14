/**
 * Standardised API response helpers.
 *
 * Success shape:
 *   { success: true, data: <any>, meta?: { page, limit, total, pages } }
 *
 * Error shape (handled by global error middleware):
 *   { success: false, error: { code, message, details? } }
 *
 * Usage:
 *   import { ok, created, paginated, noContent } from '../utils/response.js';
 *   return ok(res, pin);
 *   return created(res, newPin);
 *   return paginated(res, posts, { page, limit, total });
 *   return noContent(res);
 */

/** 200 — generic success with data. */
export const ok = (res, data) =>
  res.status(200).json({ success: true, data });

/** 201 — resource created. */
export const created = (res, data) =>
  res.status(201).json({ success: true, data });

/** 200 — paginated list. */
export const paginated = (res, data, { page, limit, total }) =>
  res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });

/** 204 — no content (delete, mark-read, etc.). */
export const noContent = (res) => res.status(204).send();

/** 200 — simple message (for actions like "followed successfully"). */
export const message = (res, msg) =>
  res.status(200).json({ success: true, message: msg });
