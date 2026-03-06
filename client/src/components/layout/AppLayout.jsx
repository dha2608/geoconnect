import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { setIsMobile } from '../../features/ui/uiSlice';
import useSocket from '../../socket/useSocket';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { ToastProvider } from '../ui/Toast';
import FeedPanel from '../posts/FeedPanel';
import UserProfilePanel from '../social/UserProfilePanel';
import CreatePinModal from '../pins/CreatePinModal';
import CreatePostModal from '../posts/CreatePostModal';
import PinDetailPanel from '../pins/PinDetailPanel';
import EventListPanel from '../events/EventListPanel';
import CreateEventModal from '../events/CreateEventModal';
import EventDetailPanel from '../events/EventDetailPanel';
import NotificationPanel from '../notifications/NotificationPanel';
import MessagesPanel from '../messages/MessagesPanel';

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
        <Outlet />
      </main>

      {/* ── Side panels (overlay alongside main, not inside it) ── */}
      <AnimatePresence>
        {activePanel === 'feed' && <FeedPanel />}
        {activePanel === 'profile' && (
          <UserProfilePanel userId={modalData?.userId || user?._id} />
        )}
        {activePanel === 'events' && <EventListPanel />}
        {activePanel === 'notifications' && <NotificationPanel />}
        {activePanel === 'messages' && <MessagesPanel />}
      </AnimatePresence>

      {/* ── Modals (always mounted, render conditionally from Redux state) ── */}
      <CreatePinModal />
      <CreatePostModal />
      <PinDetailPanel />
      <CreateEventModal />
      <EventDetailPanel />

      {isMobile && <MobileNav />}
      <ToastProvider />
    </div>
  );
}
