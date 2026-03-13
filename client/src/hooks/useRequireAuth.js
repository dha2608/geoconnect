import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Returns a guard function that checks auth before performing an action.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   const handleLike = () => {
 *     if (!requireAuth('like pins')) return;
 *     // ... do the like
 *   };
 */
export default function useRequireAuth() {
  const { isAuthenticated, isGuest } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  return (actionLabel = 'do this') => {
    if (!isAuthenticated) {
      toast.error(`Please log in to ${actionLabel}.`, { id: 'auth-required' });
      navigate('/login');
      return false;
    }
    if (isGuest) {
      toast.error(`Create an account to ${actionLabel}. Guest accounts have limited access.`, {
        id: 'guest-restricted',
        duration: 4000,
      });
      return false;
    }
    return true;
  };
}
