import { createClient } from 'redis';

/**
 * Shared Redis client — optional dependency.
 *
 * When Redis is not available (e.g. local dev without Redis),
 * getRedisClient() returns null instead of throwing/retrying.
 * Callers must handle null gracefully.
 */

let client = null;
let connecting = false;
let unavailable = false; // Set true after first failed connect — stops retries

/**
 * Get (or create) the shared Redis client.
 * Returns null if Redis is unavailable.
 */
export async function getRedisClient() {
  // Already confirmed unavailable — don't retry
  if (unavailable) return null;

  if (client?.isReady) return client;

  if (connecting) {
    // Wait for in-flight connection (max 5s)
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      const check = setInterval(() => {
        if (client?.isReady || unavailable) {
          clearInterval(check);
          clearTimeout(timeout);
          resolve();
        }
      }, 50);
    });
    return client?.isReady ? client : null;
  }

  connecting = true;
  try {
    const c = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { connectTimeoutMs: 3000, reconnectStrategy: false },
    });

    // Suppress repeated error spam — log once
    let errorLogged = false;
    c.on('error', () => {
      if (!errorLogged) {
        console.warn('[Redis] Not available — features using Redis will use fallbacks');
        errorLogged = true;
      }
    });

    c.on('connect', () => {
      console.log('[Redis] Connected');
    });

    await c.connect();
    client = c;
    return client;
  } catch {
    // Redis not available — mark as unavailable so we don't retry
    unavailable = true;
    client = null;
    console.warn('[Redis] Not available — running without Redis (rate limiting uses memory store, token blacklist disabled)');
    return null;
  } finally {
    connecting = false;
  }
}

/**
 * Gracefully disconnect Redis.
 * Called during server shutdown.
 */
export async function disconnectRedis() {
  if (client?.isReady) {
    await client.quit();
    console.log('[Redis] Disconnected');
  }
  client = null;
}

export default { getRedisClient, disconnectRedis };
