import { useSelector } from 'react-redux';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Soft gate — allows unauthenticated users to view the app.
 * Feature-level auth checks are handled by useRequireAuth hook
 * and LoginPromptModal in individual components.
 */
export default function ProtectedRoute({ children }) {
  const { loading, initialized } = useSelector((state) => state.auth);

  // Wait for auth state to initialize (token verification)
  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Allow everyone through — authenticated or not
  return children;
}
