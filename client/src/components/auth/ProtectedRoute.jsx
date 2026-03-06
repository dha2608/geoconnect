import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getMe } from '../../features/auth/authSlice';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, initialized } = useSelector((state) => state.auth);
  const location = useLocation();

  // On mount, if we have a token but haven't verified it yet, fire getMe
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !initialized && !loading) {
      dispatch(getMe());
    }
  }, [dispatch, initialized, loading]);

  // Still loading / verifying token → show spinner
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
