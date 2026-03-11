import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { setLocationPermission } from '../../features/map/mapSlice';

/**
 * LocationPermissionPrompt — glass modal that asks the user to enable location.
 *
 * Renders when:
 *   • state.map.locationPermission === 'prompt'
 *   • state.map.userLocation === null  (not yet obtained)
 *   • User has been on the app for ≥ 2 seconds (delayed so the map loads first)
 *
 * Automatically dismissed once permission is granted or denied.
 */
export default function LocationPermissionPrompt() {
  const dispatch = useDispatch();
  const { locationPermission, userLocation } = useSelector((state) => state.map);
  const [visible, setVisible] = useState(false);

  // Delay appearance by 2 s so the map finishes its initial render
  useEffect(() => {
    if (locationPermission !== 'prompt' || userLocation !== null) return;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [locationPermission, userLocation]);

  // Auto-dismiss once the hook has populated userLocation (granted flow)
  useEffect(() => {
    if (locationPermission === 'granted') {
      setVisible(false);
    }
  }, [locationPermission]);

  const handleEnable = () => {
    if (!navigator.geolocation) return;

    // Trigger the browser permission dialog so the OS prompt appears
    navigator.geolocation.getCurrentPosition(
      () => { /* success handled by useGeolocation watcher in AppLayout */ },
      () => { /* denial handled by the watcher's error callback */ },
    );

    // Optimistically mark as granted — the watcher will update userLocation
    dispatch(setLocationPermission('granted'));
    setVisible(false);
  };

  const handleDismiss = () => {
    dispatch(setLocationPermission('denied'));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        /* Backdrop */
        <motion.div
          key="location-prompt-backdrop"
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Glass card */}
          <motion.div
            key="location-prompt-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="glass rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-5 text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loc-prompt-title"
            aria-describedby="loc-prompt-desc"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-8 h-8 text-accent-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex flex-col gap-2">
              <h2
                id="loc-prompt-title"
                className="font-heading text-xl text-txt-primary"
              >
                Enable Location
              </h2>
              <p
                id="loc-prompt-desc"
                className="font-body text-sm text-txt-secondary leading-relaxed"
              >
                Allow GeoConnect to access your location to find nearby friends,
                events, and places
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              {/* Primary — blue gradient */}
              <button
                onClick={handleEnable}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-body font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80"
              >
                Enable Location
              </button>

              {/* Ghost — subtle border */}
              <button
                onClick={handleDismiss}
                className="w-full py-3 px-6 rounded-xl border border-white/10 text-txt-secondary font-body text-sm transition-colors hover:text-txt-primary hover:bg-white/5 active:bg-white/10"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
