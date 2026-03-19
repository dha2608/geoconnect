import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useRef } from 'react';
import { guestLogin } from '../../features/auth/authSlice';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Protects app routes by requiring authentication.
 * Instead of redirecting to /login, automatically creates a guest account
 * so users can explore the app without signing up.
 *
 * Flow:
 * 1. Token exists → App.jsx dispatches getMe() → wait for verification
 * 2. No token → dispatch guestLogin() → create temp guest account
 * 3. Guest login fails → redirect to landing page
 * 4. Authenticated (real or guest) → render children
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const guestTriggered = useRef(false);

  useEffect(() => {
    // Already authenticated or auth in progress — do nothing
    if (isAuthenticated || loading) return;

    // Token exists — App.jsx handles getMe() verification
    const token = localStorage.getItem('accessToken');
    if (token) return;

    // No token, not authenticated → auto guest login
    if (!guestTriggered.current) {
      guestTriggered.current = true;
      dispatch(guestLogin())
        .unwrap()
        .catch(() => {
          // Guest login failed (server error, network, etc.) → landing page
          navigate('/', { replace: true });
        });
    }
  }, [isAuthenticated, loading, dispatch, navigate]);

  // Reset flag when user becomes authenticated (allows re-guest after logout)
  useEffect(() => {
    if (isAuthenticated) {
      guestTriggered.current = false;
    }
  }, [isAuthenticated]);

  // Show loading while auth resolves (token verification or guest login)
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Authenticated — render the app
  if (isAuthenticated) {
    return children;
  }

  // Waiting for guest login to dispatch/resolve
  return (
    <div className="h-screen flex items-center justify-center bg-base">
      <LoadingSpinner size="lg" />
    </div>
  );
}
