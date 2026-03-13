import rateLimit from 'express-rate-limit';

// General API limiter — 100 requests per 15 min per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Write limiter — 30 POST/PUT/DELETE requests per 15 min per IP
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again later.' },
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,                   // 50 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});
