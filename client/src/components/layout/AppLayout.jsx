import { useEffect, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { setIsMobile } from '../../features/ui/uiSlice';
import useSocket from '../../socket/useSocket';
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

// Heavy panels — lazy-loaded so they don't block the initial map render
const FeedPanel         = lazy(() => import('../posts/FeedPanel'));
const NotificationPanel = lazy(() => import('../notifications/NotificationPanel'));
const MessagesPanel     = lazy(() => import('../messages/MessagesPanel'));
const SearchPanel       = lazy(() => import('../search/SearchPanel'));

export default function AppLayout() {
  const dispatch = useDispatch();
  const { isMobile, activePanel, modalData } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  // Initialize persistent socket connection for this session
  useSocket();

  // NOTE: getMe() is called by ProtectedRoute — no need to call it here

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
      <ToastProvider />
    </div>
  );
}
