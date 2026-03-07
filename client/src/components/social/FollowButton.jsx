import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toggleFollow } from '../../features/users/userSlice';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

export default function FollowButton({ userId, isFollowing: externalFollowing, size = 'md' }) {
  const dispatch = useDispatch();
  const [isFollowing, setIsFollowing] = useState(externalFollowing);
  const [loading, setLoading] = useState(false);

  // Sync with external prop when it changes
  useEffect(() => {
    setIsFollowing(externalFollowing);
  }, [externalFollowing]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    const previousState = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      await dispatch(toggleFollow(userId)).unwrap();
    } catch (err) {
      // Revert on failure
      setIsFollowing(previousState);
      toast.error(err?.message || 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : 'primary'}
      size={size}
      onClick={handleToggle}
      loading={loading}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
