import { useEffect, useState, lazy, Suspense, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { setDeviceSize, setSidebarOpen, closePanel } from '../../features/ui/uiSlice';
import { fetchUnreadCount } from '../../features/messages/messageSlice';
import useSocket from '../../socket/useSocket';
import useGeolocation from '../../hooks/useGeolocation';
import { useKeyboardShortcuts, ShortcutHelpOverlay } from '../../hooks/useKeyboardShortcuts';
import useSwipeGesture from '../../hooks/useSwipeGesture';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { ToastProvider } from '../ui/Toast';
import UserProfilePanel from '../social/UserProfilePanel';
import CreatePinModal from '../pins/CreatePinModal';
import EditPinModal from '../pins/EditPinModal';
import CreatePostModal from '../posts/CreatePostModal';
import EditPostModal from '../posts/EditPostModal';
import PinDetailPanel from '../pins/PinDetailPanel';
import EventListPanel from '../events/EventListPanel';
import CreateEventModal from '../events/CreateEventModal';
import EventDetailPanel from '../events/EventDetailPanel';
import SectionErrorBoundary from '../SectionErrorBoundary';
import LocationPermissionPrompt from '../map/LocationPermissionPrompt';
import CommandPalette from '../ui/CommandPalette';
import NotificationToast from '../ui/NotificationToast';
import LiveIndicator from '../ui/LiveIndicator';
import OnboardingTour from '../ui/OnboardingTour';
import WelcomeChecklist from '../ui/WelcomeChecklist';
import { requestNotificationPermission } from '../../utils/notificationSound';

// Heavy panels — lazy-loaded so they don't block the initial map render
const FeedPanel         = lazy(() => import('../posts/FeedPanel'));
const NotificationPanel = lazy(() => import('../notifications/NotificationPanel'));
const MessagesPanel     = lazy(() => import('../messages/MessagesPanel'));
const SearchPanel       = lazy(() => import('../search/SearchPanel'));

/** Derive UI theme from the active map tile layer */
const LIGHT_TILES = new Set(['street', 'light', 'satellite']);

export default function AppLayout() {
  const dispatch = useDispatch();
  const { isMobile, isTablet, sidebarOpen, sidebarExpanded, activePanel, modalData } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const { tileLayer } = useSelector((state) => state.map);

  // Keyboard shortcuts — exposes help overlay state
  const { showShortcutHelp, setShowShortcutHelp } = useKeyboardShortcuts();

  // Onboarding tour — delayed show after login, only once per user
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Derive theme: dark map → dark UI, light/street/satellite → light frosted glass
  const theme = useMemo(() => LIGHT_TILES.has(tileLayer) ? 'light' : 'dark', [tileLayer]);

  // Apply data-theme to document root for CSS variable cascade
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initialize persistent socket connection for this session
  useSocket();

  // Start watching geolocation immediately; surfaces locationError to app-level if needed
  const { locationError } = useGeolocation({ autoWatch: true }); // eslint-disable-line no-unused-vars

  // NOTE: getMe() is called by ProtectedRoute — no need to call it here

  // Fetch unread message count on mount
  useEffect(() => {
    if (user?._id) dispatch(fetchUnreadCount());
  }, [dispatch, user?._id]);

  // Show onboarding tour once, 2 s after auth, if not already completed
  useEffect(() => {
    const done = localStorage.getItem('geoconnect_onboarding_complete');
    if (!done && user?._id) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user?._id]);

  // Request browser notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const handleResize = () => dispatch(setDeviceSize(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  // ── Swipe gesture: right from left-edge → open sidebar; left → close sidebar / panel ──
  const swipeHandlers = useSwipeGesture({
    onSwipeRight: useCallback(() => {
      if (!sidebarOpen && !activePanel) dispatch(setSidebarOpen(true));
    }, [sidebarOpen, activePanel, dispatch]),
    onSwipeLeft: useCallback(() => {
      if (sidebarOpen)     dispatch(setSidebarOpen(false));
      else if (activePanel) dispatch(closePanel());
    }, [sidebarOpen, activePanel, dispatch]),
    threshold:   50,
    maxDuration: 300,
    edgeWidth:   30, // right-swipe only fires when touch starts ≤ 30 px from left
  });

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-base"
      {...(isMobile ? swipeHandlers : {})}
    >
      <div className="aurora-bg" />
      <Header />
      <Sidebar />
      <main
        className={`fixed top-16 bottom-0 right-0 overflow-hidden ${isMobile ? 'left-0 pb-16' : ''}`}
        style={isMobile ? undefined : { left: sidebarExpanded ? 240 : 72, transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
        role="main"
      >
        <SectionErrorBoundary name="Map">
          <Outlet />
        </SectionErrorBoundary>
      </main>

      {/* ── Side panels ─────────────────────────────────────────────────────── */}
      {/* Mobile: single motion wrapper slides the active panel in from the right */}
      {isMobile ? (
        <AnimatePresence>
          {activePanel && (
            <motion.div
              key={activePanel}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="fixed top-16 bottom-16 left-0 right-0 z-[35] overflow-hidden"
            >
              {activePanel === 'feed' && (
                <SectionErrorBoundary name="Feed">
                  <Suspense fallback={null}><FeedPanel /></Suspense>
                </SectionErrorBoundary>
              )}
              {activePanel === 'profile' && (
                <SectionErrorBoundary name="Profile">
                  <UserProfilePanel userId={modalData?.userId || user?._id} />
                </SectionErrorBoundary>
              )}
              {activePanel === 'events' && (
                <SectionErrorBoundary name="Events">
                  <EventListPanel />
                </SectionErrorBoundary>
              )}
              {activePanel === 'notifications' && (
                <SectionErrorBoundary name="Notifications">
                  <Suspense fallback={null}><NotificationPanel /></Suspense>
                </SectionErrorBoundary>
              )}
              {activePanel === 'messages' && (
                <SectionErrorBoundary name="Messages">
                  <Suspense fallback={null}><MessagesPanel /></Suspense>
                </SectionErrorBoundary>
              )}
              {activePanel === 'search' && (
                <SectionErrorBoundary name="Search">
                  <Suspense fallback={null}><SearchPanel /></Suspense>
                </SectionErrorBoundary>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        /* Desktop: each panel manages its own spring animation (slide from left) */
        <AnimatePresence>
          {activePanel === 'feed' && (
            <SectionErrorBoundary name="Feed">
              <Suspense fallback={null}><FeedPanel /></Suspense>
            </SectionErrorBoundary>
          )}
          {activePanel === 'profile' && (
            <SectionErrorBoundary name="Profile">
              <UserProfilePanel userId={modalData?.userId || user?._id} />
            </SectionErrorBoundary>
          )}
          {activePanel === 'events' && (
            <SectionErrorBoundary name="Events">
              <EventListPanel />
            </SectionErrorBoundary>
          )}
          {activePanel === 'notifications' && (
            <SectionErrorBoundary name="Notifications">
              <Suspense fallback={null}><NotificationPanel /></Suspense>
            </SectionErrorBoundary>
          )}
          {activePanel === 'messages' && (
            <SectionErrorBoundary name="Messages">
              <Suspense fallback={null}><MessagesPanel /></Suspense>
            </SectionErrorBoundary>
          )}
          {activePanel === 'search' && (
            <SectionErrorBoundary name="Search">
              <Suspense fallback={null}><SearchPanel /></Suspense>
            </SectionErrorBoundary>
          )}
        </AnimatePresence>
      )}

      {/* ── Modals (always mounted, render conditionally from Redux state) ── */}
      <CreatePinModal />
      <EditPinModal />
      <CreatePostModal />
      <EditPostModal />
      <PinDetailPanel />
      <CreateEventModal />
      <EventDetailPanel />

      {isMobile && <MobileNav />}
      <LocationPermissionPrompt />
      <ToastProvider />

      {/* ── Command Palette (Cmd+K) ── */}
      <CommandPalette />

      {/* ── Real-time notification toasts ── */}
      <NotificationToast />

      {/* ── Onboarding tour (shown once after first login) ── */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTour onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* ── Getting-started checklist (persistent until dismissed/complete) ── */}
      <WelcomeChecklist />

      {/* ── Keyboard shortcuts help overlay ── */}
      <AnimatePresence>
        {showShortcutHelp && (
          <ShortcutHelpOverlay
            key="shortcut-help"
            onClose={() => setShowShortcutHelp(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
