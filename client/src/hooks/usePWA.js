import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage PWA install prompt and SW update notifications.
 *
 * Returns:
 *  - canInstall: true if app can be installed (beforeinstallprompt fired)
 *  - promptInstall: function to trigger install dialog
 *  - hasUpdate: true if SW posted an update message
 *  - dismissUpdate: clears hasUpdate flag
 */
export default function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Capture the install prompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Listen for SW update messages
    const handleSWMessage = (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        setHasUpdate(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Check if already installed (display-mode: standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissUpdate = useCallback(() => setHasUpdate(false), []);

  return { canInstall, promptInstall, hasUpdate, dismissUpdate };
}
