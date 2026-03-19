import { useSelector } from 'react-redux';
import { useCallback, useState } from 'react';
import LoginPromptModal from '../components/ui/LoginPromptModal';

/**
 * Returns a guard function that checks auth before performing an action.
 * Shows a LoginPromptModal instead of navigating away.
 *
 * Usage:
 *   const { requireAuth, AuthGate } = useRequireAuth();
 *   const handleLike = () => {
 *     if (!requireAuth('like pins')) return;
 *     // ... do the like
 *   };
 *   return <>{AuthGate}<button onClick={handleLike}>Like</button></>
 */
export default function useRequireAuth() {
  const { isAuthenticated, isGuest } = useSelector((s) => s.auth);
  const [showModal, setShowModal] = useState(false);
  const [feature, setFeature] = useState('');

  const requireAuth = useCallback(
    (actionLabel = 'do this') => {
      if (!isAuthenticated || isGuest) {
        setFeature(actionLabel);
        setShowModal(true);
        return false;
      }
      return true;
    },
    [isAuthenticated, isGuest]
  );

  const AuthGate = showModal ? (
    <LoginPromptModal feature={feature} onClose={() => setShowModal(false)} />
  ) : null;

  return { requireAuth, AuthGate, isAuthenticated };
}
