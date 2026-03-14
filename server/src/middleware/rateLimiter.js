import rateLimit from 'express-rate-limit';

// General API limiter — 600 requests per 15 min per IP
// SPAs fire many parallel requests per navigation (map tiles, discover, feed, etc.)
// so the limit must be generous enough to avoid 429 storms.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Write limiter — 60 POST/PUT/DELETE requests per 15 min per IP
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later.' },
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                   // 20 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Geocode limiter — separate from the global limiter to avoid double-counting
export const geocodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,                  // geocode search is called frequently during typing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many geocode requests, please try again later.' },
});
