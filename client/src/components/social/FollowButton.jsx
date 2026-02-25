import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toggleFollow } from '../../features/users/userSlice';
import Button from '../ui/Button';

export default function FollowButton({ userId, isFollowing: initialFollowing, size = 'md' }) {
  const dispatch = useDispatch();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await dispatch(toggleFollow(userId)).unwrap();
      setIsFollowing(!isFollowing);
    } catch { /* noop */ }
    setLoading(false);
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
