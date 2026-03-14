import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../utils/redis.js';

/**
 * Redis-backed rate-limit store (shared by all limiters).
 * Falls back to in-memory if Redis is unavailable.
 */
let redisStoreInstance = null;
let redisInitDone = false;

async function ensureRedisStore() {
  if (redisInitDone) return redisStoreInstance;
  redisInitDone = true;
  try {
    const client = await getRedisClient();
    redisStoreInstance = new RedisStore({
      sendCommand: (...args) => client.sendCommand(args),
      prefix: 'rl:',
    });
    console.log('[RateLimiter] Using Redis store');
  } catch {
    console.warn('[RateLimiter] Redis unavailable — falling back to in-memory store');
  }
  return redisStoreInstance;
}

/**
 * Create a rate limiter that attempts Redis store on first request.
 * If Redis is down, falls back to express-rate-limit's default in-memory store.
 */
function createLimiter({ windowMs, max, message }) {
  // Default in-memory limiter (immediate — no async needed)
  const memoryLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

  let redisLimiter = null;
  let resolved = false;

  return async (req, res, next) => {
    if (!resolved) {
      resolved = true;
      const store = await ensureRedisStore();
      if (store) {
        redisLimiter = rateLimit({
          windowMs,
          max,
          standardHeaders: true,
          legacyHeaders: false,
          message: { error: message },
          store,
        });
      }
    }
    const limiter = redisLimiter || memoryLimiter;
    return limiter(req, res, next);
  };
}

// ─── Exported limiters ───────────────────────────────────────────────────────

/** General API limiter — 600 requests per 15 min per IP */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Too many requests, please try again later.',
});

/** Write limiter — 60 POST/PUT/DELETE requests per 15 min per IP */
export const writeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many write requests, please try again later.',
});

/** Stricter limiter for auth endpoints (prevent brute force) */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts, please try again later.',
});

/** Geocode limiter — separate bucket to avoid double-counting */
export const geocodeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many geocode requests, please try again later.',
});
