import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, initialized } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const redirecting = useRef(false);

  // Use imperative navigate instead of <Navigate> component to avoid
  // infinite re-render loop caused by AnimatePresence + key={location.pathname}
  // re-mounting the route tree during exit animations.
  useEffect(() => {
    if (initialized && !loading && !isAuthenticated && !redirecting.current) {
      redirecting.current = true;
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
    if (isAuthenticated) {
      redirecting.current = false;
    }
  }, [initialized, loading, isAuthenticated, navigate, location.pathname]);

  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Return null while useEffect handles the redirect
  if (!isAuthenticated) {
    return null;
  }

  return children;
}
