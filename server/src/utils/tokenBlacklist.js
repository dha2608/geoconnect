import { getRedisClient } from './redis.js';

const BLACKLIST_PREFIX = 'bl:';

/**
 * Blacklist a JWT token until its expiry.
 * @param {string} token  — The raw JWT string
 * @param {number} ttlSeconds — Seconds until the token naturally expires
 */
export async function blacklistToken(token, ttlSeconds) {
  try {
    const client = await getRedisClient();
    if (!client) return; // Redis unavailable — skip silently
    await client.set(`${BLACKLIST_PREFIX}${token}`, '1', { EX: Math.max(ttlSeconds, 1) });
  } catch (err) {
    // Redis down — log but don't block the logout/password-change flow
    console.error('[TokenBlacklist] Failed to blacklist:', err.message);
  }
}

/**
 * Check whether a token has been blacklisted.
 * @param {string} token
 * @returns {boolean}
 */
export async function isTokenBlacklisted(token) {
  try {
    const client = await getRedisClient();
    if (!client) return false; // Redis unavailable — fail-open
    const result = await client.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch {
    // Redis down — allow the token (fail-open to avoid locking out all users)
    return false;
  }
}
