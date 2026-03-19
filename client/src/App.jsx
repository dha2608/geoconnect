import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
const LandingPage = lazy(() => import('./pages/LandingPage'));

function App() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { initialized, isAuthenticated } = useSelector((state) => state.auth);
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

  // Compute route group — only re-key Routes when switching between
  // top-level sections (app ↔ auth ↔ landing). This prevents AppLayout
  // from unmounting/remounting on child route changes (which would
  // destroy socket connections, geolocation watchers, and all layout state).
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password']
    .some((p) => location.pathname.startsWith(p));
  const routeGroup = location.pathname === '/'
    ? 'landing'
    : isAuthRoute
      ? 'auth'
      : 'app';

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
            <Routes location={location} key={routeGroup}>
              {/* Landing page — entry point. Authenticated users redirect to /map */}
              <Route path="/" element={
                isAuthenticated
                  ? <Navigate to="/map" replace />
                  : <PageTransition><LandingPage /></PageTransition>
              } />

              {/* Auth routes */}
              <Route path="/login" element={<PageTransition><AuthPage /></PageTransition>} />
              <Route path="/register" element={<PageTransition><AuthPage /></PageTransition>} />
              <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
              <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

              {/* App routes — ProtectedRoute auto-creates guest account if needed.
                  AppLayout handles its own page transitions via AnimatePresence
                  around <Outlet />, so child routes don't need <PageTransition>. */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/map" element={<MapView />} />
                <Route path="/profile/:userId?" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/collections" element={<CollectionsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
              </Route>

              {/* Legacy /welcome redirect */}
              <Route path="/welcome" element={<Navigate to="/" replace />} />

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
