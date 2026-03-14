import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, initialized } = useSelector((state) => state.auth);
  const location = useLocation();

  // App.jsx dispatches getMe() globally — just wait for it to resolve here.
  if (loading || (!initialized && localStorage.getItem('accessToken'))) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Verified: not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
