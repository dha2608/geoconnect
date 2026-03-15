/**
 * useOfflineHydration — pre-populates Redux from IndexedDB on mount.
 *
 * Runs once. Reads cached auth-user, user-profile, notifications,
 * and conversations and dispatches them into the store so the app
 * renders instantly even when the network is slow or offline.
 *
 * Fresh API data (getMe, fetchNotifications, etc.) overwrites the
 * stale cache once it arrives — standard stale-while-revalidate.
 */
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getCache } from '../utils/offlineCache';
import { setUser } from '../features/auth/authSlice';
import { hydrateNotifications } from '../features/notifications/notificationSlice';
import { hydrateConversations } from '../features/messages/messageSlice';
import { hydrateProfile } from '../features/users/userSlice';

const ONE_DAY = 24 * 60 * 60 * 1000;

export default function useOfflineHydration() {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Only hydrate auth if a token exists in localStorage —
      // prevents stale cache from setting isAuthenticated = true
      // when the token has been cleared by forceLogout.
      const hasToken = !!localStorage.getItem('accessToken');

      const [authUser, profile, notifications, conversations] = await Promise.all([
        hasToken ? getCache('auth-user', ONE_DAY) : null,
        hasToken ? getCache('user-profile', ONE_DAY) : null,
        hasToken ? getCache('notifications', ONE_DAY) : null,
        hasToken ? getCache('conversations', ONE_DAY) : null,
      ]);

      if (cancelled) return;

      if (authUser) dispatch(setUser(authUser));
      if (profile) dispatch(hydrateProfile(profile));
      if (notifications) dispatch(hydrateNotifications(notifications));
      if (conversations) dispatch(hydrateConversations(conversations));
    })();

    return () => { cancelled = true; };
  }, [dispatch]);
}
