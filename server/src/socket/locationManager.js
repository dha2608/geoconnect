/**
 * locationManager.js
 * ──────────────────────────────────────────────────────────────────────────────
 * In-memory store for real-time user locations.
 *
 * Reduces MongoDB writes by buffering location updates in memory and
 * flushing to DB on a configurable interval.  Socket handler reads from
 * the in-memory map for instant friend-location broadcasts.
 *
 * Stale entries (users who stopped updating) are auto-pruned.
 */

import User from '../models/User.js';

// ─── Configuration ───────────────────────────────────────────────────────────

const DB_FLUSH_INTERVAL_MS = 30_000;  // flush to DB every 30 s
const STALE_THRESHOLD_MS   = 120_000; // prune entries older than 2 min

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Map<userId, { lat, lng, heading, timestamp, dirty }>
 * `dirty` flags entries that haven't been flushed to DB yet.
 */
const locations = new Map();

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Record a user's latest position.
 * @param {string} userId
 * @param {{ lat: number, lng: number, heading?: number }} data
 */
export function updateLocation(userId, { lat, lng, heading }) {
  locations.set(userId, {
    lat,
    lng,
    heading: heading ?? null,
    timestamp: Date.now(),
    dirty: true,
  });
}

/**
 * Get a user's in-memory location (or null).
 * @param {string} userId
 * @returns {{ lat: number, lng: number, heading: number|null, timestamp: number } | null}
 */
export function getLocation(userId) {
  const entry = locations.get(userId);
  if (!entry) return null;
  return { lat: entry.lat, lng: entry.lng, heading: entry.heading, timestamp: entry.timestamp };
}

/**
 * Remove a user from the live store (e.g. disconnect / stop sharing).
 * @param {string} userId
 */
export function removeLocation(userId) {
  locations.delete(userId);
}

/**
 * Get all currently-tracked user IDs.
 * @returns {string[]}
 */
export function getActiveUserIds() {
  return [...locations.keys()];
}

/**
 * Get locations for a list of user IDs (e.g. a user's mutual friends).
 * @param {string[]} userIds
 * @returns {Map<string, { lat, lng, heading, timestamp }>}
 */
export function getLocationsForUsers(userIds) {
  const result = new Map();
  for (const id of userIds) {
    const entry = locations.get(id);
    if (entry) {
      result.set(id, { lat: entry.lat, lng: entry.lng, heading: entry.heading, timestamp: entry.timestamp });
    }
  }
  return result;
}

// ─── Background tasks ────────────────────────────────────────────────────────

let flushTimer = null;

/** Flush dirty locations to MongoDB in a single bulk write. */
async function flushToDB() {
  const dirtyEntries = [];
  for (const [userId, entry] of locations) {
    if (entry.dirty) {
      dirtyEntries.push({ userId, lng: entry.lng, lat: entry.lat });
      entry.dirty = false;
    }
  }

  if (dirtyEntries.length === 0) return;

  try {
    const bulkOps = dirtyEntries.map(({ userId, lng, lat }) => ({
      updateOne: {
        filter: { _id: userId },
        update: {
          $set: {
            location: { type: 'Point', coordinates: [lng, lat] },
            lastLocationUpdate: new Date(),
          },
        },
      },
    }));

    await User.bulkWrite(bulkOps, { ordered: false });
  } catch (err) {
    console.error('[locationManager] DB flush error:', err.message);
  }
}

/** Remove entries that haven't been updated recently. */
function pruneStale() {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  for (const [userId, entry] of locations) {
    if (entry.timestamp < cutoff) {
      locations.delete(userId);
    }
  }
}

/** Start the background flush + prune loop. Called once at server boot. */
export function startLocationManager() {
  if (flushTimer) return; // already running
  flushTimer = setInterval(async () => {
    pruneStale();
    await flushToDB();
  }, DB_FLUSH_INTERVAL_MS);

  // Don't let the timer keep the process alive
  if (flushTimer.unref) flushTimer.unref();

  console.log('[locationManager] Started — flush interval', DB_FLUSH_INTERVAL_MS, 'ms');
}

/** Stop the background loop (graceful shutdown). */
export function stopLocationManager() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
