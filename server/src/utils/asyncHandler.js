/**
 * Wraps an async Express route handler so thrown errors
 * are forwarded to the global error middleware automatically.
 *
 * Eliminates repetitive try-catch blocks in every controller.
 *
 * Usage:
 *   import { asyncHandler } from '../utils/asyncHandler.js';
 *   router.get('/pins', asyncHandler(async (req, res) => { ... }));
 *
 * Or wrap an entire controller export:
 *   export const getPin = asyncHandler(async (req, res) => { ... });
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
