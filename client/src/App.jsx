import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/ui/PageTransition';
import OfflineBanner from './components/ui/OfflineBanner';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const MapView = lazy(() => import('./components/map/MapView'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <>
        <OfflineBanner />
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
              <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
              <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

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
              </Route>
            </Routes>
          </AnimatePresence>
        </Suspense>
      </>
    </ErrorBoundary>
  );
}

export default App;
