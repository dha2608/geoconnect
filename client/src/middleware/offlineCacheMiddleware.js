/**
 * Redux middleware that persists selected slice data to IndexedDB
 * after relevant actions complete.
 *
 * This is a lightweight alternative to redux-persist — only caches
 * the specific data needed for offline rendering, with no library overhead.
 */
import { setCache, clearAllCache } from '../utils/offlineCache';

// Map of cache key → state selector
const CACHE_MAP = {
  'user-profile': (state) => state.users?.profile,
  'auth-user': (state) => state.auth?.user,
  'notifications': (state) => state.notifications?.items,
  'conversations': (state) => state.messages?.conversations,
};

// Action type substrings that trigger cache writes
const TRIGGER_ACTIONS = [
  'auth/getMe/fulfilled',
  'auth/login/fulfilled',
  'users/fetchProfile/fulfilled',
  'users/toggleFollow/fulfilled',
  'notifications/fetch/fulfilled',
  'messages/fetchConversations/fulfilled',
];

// Debounce timer ref
let timer = null;

export const offlineCacheMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  // Clear cache on any form of logout (normal, forced, or thunk)
  if (
    action.type === 'auth/logout' ||
    action.type === 'auth/logout/fulfilled' ||
    action.type === 'auth/forceLogout'
  ) {
    clearAllCache();
    return result;
  }

  // Check if this action should trigger a cache write
  const shouldCache = TRIGGER_ACTIONS.some((t) => action.type === t);
  if (!shouldCache) return result;

  // Debounce writes to avoid hammering IndexedDB
  clearTimeout(timer);
  timer = setTimeout(() => {
    const state = store.getState();
    for (const [key, selector] of Object.entries(CACHE_MAP)) {
      const data = selector(state);
      if (data != null) {
        setCache(key, data);
      }
    }
  }, 500);

  return result;
};
