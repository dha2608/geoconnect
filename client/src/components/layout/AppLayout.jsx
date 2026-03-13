import { useEffect, lazy, Suspense, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { setIsMobile } from '../../features/ui/uiSlice';
import { fetchUnreadCount } from '../../features/messages/messageSlice';
import useSocket from '../../socket/useSocket';
import useGeolocation from '../../hooks/useGeolocation';
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

// Heavy panels — lazy-loaded so they don't block the initial map render
const FeedPanel         = lazy(() => import('../posts/FeedPanel'));
const NotificationPanel = lazy(() => import('../notifications/NotificationPanel'));
const MessagesPanel     = lazy(() => import('../messages/MessagesPanel'));
const SearchPanel       = lazy(() => import('../search/SearchPanel'));

/** Derive UI theme from the active map tile layer */
const LIGHT_TILES = new Set(['street', 'light', 'satellite']);

export default function AppLayout() {
  const dispatch = useDispatch();
  const { isMobile, activePanel, modalData } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const { tileLayer } = useSelector((state) => state.map);

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

  useEffect(() => {
    const handleResize = () => {
      dispatch(setIsMobile(window.innerWidth < 768));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-base">
      <div className="aurora-bg" />
      <Header />
      <Sidebar />
      <main className={`fixed top-16 bottom-0 right-0 ${isMobile ? 'left-0 pb-16' : 'left-[72px]'} overflow-hidden`}>
        <SectionErrorBoundary name="Map">
          <Outlet />
        </SectionErrorBoundary>
      </main>

      {/* ── Side panels (overlay alongside main, not inside it) ── */}
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
    </div>
  );
}
