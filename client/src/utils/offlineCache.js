/**
 * Lightweight IndexedDB wrapper for offline data caching.
 *
 * Stores serialised JSON for key Redux slice data so the app can
 * render a stale-while-revalidate view when the user is offline.
 *
 * DB: geoconnect-offline  |  Object store: cache
 * Each entry: { key: string, data: any, updatedAt: number }
 */

const DB_NAME = 'geoconnect-offline';
const DB_VERSION = 1;
const STORE = 'cache';

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * Persist data under a given key.
 * @param {string} key
 * @param {*} data  Must be structuredClone-safe (plain objects/arrays).
 */
export async function setCache(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, data, updatedAt: Date.now() });
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    // Silently swallow — caching is best-effort
  }
}

/**
 * Read cached data by key.
 * @param {string} key
 * @param {number} [maxAge=Infinity]  Max age in ms. Returns null if stale.
 * @returns {Promise<*|null>}
 */
export async function getCache(key, maxAge = Infinity) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const row = req.result;
        if (!row) return resolve(null);
        if (maxAge !== Infinity && Date.now() - row.updatedAt > maxAge) {
          return resolve(null);
        }
        resolve(row.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove a specific cache entry.
 * @param {string} key
 */
export async function removeCache(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
  } catch {
    // best-effort
  }
}

/**
 * Wipe all cached data (e.g. on logout).
 */
export async function clearAllCache() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
  } catch {
    // best-effort
  }
}
