import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import { getMe } from './features/auth/authSlice';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/ui/PageTransition';
import OfflineBanner from './components/ui/OfflineBanner';
import usePWA from './hooks/usePWA';
import useOfflineHydration from './hooks/useOfflineHydration';
import { InstallBanner, UpdateToast } from './components/pwa/PWAPrompts';

const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const MapView = lazy(() => import('./components/map/MapView'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { initialized } = useSelector((state) => state.auth);
  const { canInstall, promptInstall, hasUpdate, dismissUpdate } = usePWA();
  useOfflineHydration();
  const [showInstall, setShowInstall] = useState(true);

  const handleInstall = useCallback(async () => {
    await promptInstall();
    setShowInstall(false);
  }, [promptInstall]);

  const handleDismissInstall = useCallback(() => setShowInstall(false), []);
  const handleRefresh = useCallback(() => window.location.reload(), []);

  // Verify token on app mount, regardless of which route the user lands on.
  // Without this, landing on /login with a stale token in localStorage
  // leaves loading=true forever because only ProtectedRoute used to
  // dispatch getMe().
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !initialized) {
      dispatch(getMe());
    }
  }, [dispatch, initialized]);

  return (
    <ErrorBoundary>
      <>
        <OfflineBanner />
        <UpdateToast show={hasUpdate} onRefresh={handleRefresh} onDismiss={dismissUpdate} />
        <InstallBanner show={canInstall && showInstall} onInstall={handleInstall} onDismiss={handleDismissInstall} />
        <Suspense
          fallback={
            <div className="h-screen flex items-center justify-center bg-base">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Auth routes */}
              <Route path="/login" element={<PageTransition><AuthPage /></PageTransition>} />
              <Route path="/register" element={<PageTransition><AuthPage /></PageTransition>} />
              <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
              <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

              {/* Protected app routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PageTransition><MapView /></PageTransition>} />
                <Route path="profile/:userId?" element={<PageTransition><ProfilePage /></PageTransition>} />
                <Route path="settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                <Route path="explore" element={<PageTransition><ExplorePage /></PageTransition>} />
                <Route path="activity" element={<PageTransition><ActivityPage /></PageTransition>} />
                <Route path="collections" element={<PageTransition><CollectionsPage /></PageTransition>} />
                <Route path="events" element={<PageTransition><EventsPage /></PageTransition>} />
                <Route path="messages" element={<PageTransition><MessagesPage /></PageTransition>} />
                <Route path="admin" element={<AdminRoute><PageTransition><AdminDashboard /></PageTransition></AdminRoute>} />
                <Route path="admin/users" element={<AdminRoute><PageTransition><AdminUsers /></PageTransition></AdminRoute>} />
                <Route path="admin/reports" element={<AdminRoute><PageTransition><AdminReports /></PageTransition></AdminRoute>} />
              </Route>
              {/* 404 catch-all */}
              <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </>
    </ErrorBoundary>
  );
}

export default App;
