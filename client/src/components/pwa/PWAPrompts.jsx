import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PWA Install banner — shown when `canInstall` is true.
 * Dismissible via × button. Calls `onInstall` to trigger install prompt.
 */
export const InstallBanner = memo(function InstallBanner({ show, onInstall, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[90] bg-surface-primary/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-blue/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-content-primary">Install GeoConnect</p>
              <p className="text-xs text-content-secondary mt-0.5">Add to your home screen for faster access and offline support.</p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={onInstall}
                  className="px-3 py-1.5 text-xs font-medium bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/30 transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-xs font-medium text-content-tertiary hover:text-content-secondary transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={onDismiss} className="text-content-tertiary hover:text-content-secondary p-1" aria-label="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * SW update toast — shown when `hasUpdate` is true.
 * User clicks "Refresh" to reload with new version.
 */
export const UpdateToast = memo(function UpdateToast({ show, onRefresh, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[95] bg-surface-primary/95 backdrop-blur-xl border border-accent-emerald/30 rounded-2xl p-4 shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-emerald/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">Update available</p>
              <p className="text-xs text-content-secondary">A new version of GeoConnect is ready.</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onRefresh}
                className="px-2.5 py-1 text-xs font-medium bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 rounded-lg hover:bg-accent-emerald/30 transition-colors"
              >
                Refresh
              </button>
              <button onClick={onDismiss} className="text-content-tertiary hover:text-content-secondary p-1" aria-label="Dismiss">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
