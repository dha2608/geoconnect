import { createClient } from 'redis';

/**
 * Shared Redis client.
 *
 * Reads REDIS_URL from env (default: redis://localhost:6379).
 * Exports a singleton that auto-connects on first use.
 * Callers should `await redisClient.connect()` at startup or
 * rely on lazy-connect inside individual utilities.
 */

let client = null;
let connecting = false;

/**
 * Get (or create) the shared Redis client.
 * Connects lazily on first call.
 */
export async function getRedisClient() {
  if (client?.isReady) return client;
  if (connecting) {
    // Wait for in-flight connection
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (client?.isReady) { clearInterval(check); resolve(); }
      }, 50);
    });
    return client;
  }

  connecting = true;
  try {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected');
    });

    await client.connect();
    return client;
  } catch (err) {
    console.error('[Redis] Failed to connect:', err.message);
    client = null;
    throw err;
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
