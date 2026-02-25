import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fetchUserProfile, clearProfile } from '../../features/users/userSlice';
import { closePanel } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';
import GlassCard from '../ui/GlassCard';
import FollowButton from './FollowButton';

// ──────────────────────────────────────────────
// Skeleton shown while profile is loading
// ──────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Avatar + name block */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 bg-white/5 rounded-lg w-2/3" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-4/5" />
        </div>
      </div>
      {/* Stats block */}
      <div className="glass p-4 rounded-2xl">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-7 bg-white/5 rounded w-10" />
              <div className="h-3 bg-white/5 rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Tab bar
// ──────────────────────────────────────────────
const TABS = [
  { id: 'posts',  label: 'Posts' },
  { id: 'saved',  label: 'Saved Pins' },
];

// ──────────────────────────────────────────────
// Main panel
// ──────────────────────────────────────────────
export default function UserProfilePanel({ userId }) {
  const dispatch = useDispatch();
  const { profile, loading } = useSelector((state) => state.users);
  const { user: currentUser }  = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('posts');

  // Fetch on mount, clear on unmount
  useEffect(() => {
    if (userId) dispatch(fetchUserProfile(userId));
    return () => { dispatch(clearProfile()); };
  }, [userId, dispatch]);

  const isCurrentUser = currentUser?._id === userId;
  const isFollowing   = Array.isArray(currentUser?.following)
    ? currentUser.following.includes(userId)
    : false;

  const joinDate = profile?.createdAt
    ? format(new Date(profile.createdAt), 'MMMM yyyy')
    : null;

  return (
    <motion.div
      initial={{ x: -380 }}
      animate={{ x: 0 }}
      exit={{ x: -380 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed top-16 bottom-0 left-[72px] w-[380px] z-20 bg-base/95 backdrop-blur-xl border-r border-accent-primary/10 overflow-y-auto"
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => dispatch(closePanel())}
          aria-label="Close profile"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="font-heading font-semibold text-txt-primary text-lg">Profile</h2>
      </div>

      {/* ── Body ── */}
      <div className="p-4 space-y-4">
        {loading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <>
            {/* ── Profile card ── */}
            <GlassCard padding="p-5" animate={false}>
              <div className="flex items-start gap-4">
                <Avatar
                  src={profile.avatar}
                  name={profile.username}
                  size="lg"
                  online={profile.isOnline}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-txt-primary text-xl leading-tight truncate">
                    {profile.username}
                  </h3>
                  {profile.email && (
                    <p className="text-txt-muted text-sm truncate mt-0.5">{profile.email}</p>
                  )}
                  {joinDate && (
                    <p className="text-txt-muted text-xs mt-1.5 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8"  y1="2" x2="8"  y2="6" />
                        <line x1="3"  y1="10" x2="21" y2="10" />
                      </svg>
                      Joined {joinDate}
                    </p>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="mt-4 text-txt-secondary text-sm leading-relaxed border-t border-white/5 pt-4">
                  {profile.bio}
                </p>
              )}

              {!isCurrentUser && (
                <div className="mt-4 flex">
                  <FollowButton userId={profile._id} isFollowing={isFollowing} size="md" />
                </div>
              )}
            </GlassCard>

            {/* ── Stats row ── */}
            <GlassCard padding="p-4" animate={false}>
              <div className="grid grid-cols-3 divide-x divide-white/5">
                {[
                  { label: 'Posts',     value: profile.postsCount      ?? 0 },
                  { label: 'Followers', value: profile.followers?.length ?? 0 },
                  { label: 'Following', value: profile.following?.length ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center py-1 px-2 gap-0.5">
                    <span className="font-heading font-bold text-txt-primary text-xl">{value}</span>
                    <span className="text-txt-muted text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* ── Tabs ── */}
            <div className="flex gap-1 p-1 glass rounded-xl">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150
                    ${activeTab === id
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'text-txt-muted hover:text-txt-secondary'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab content (placeholder) ── */}
            <GlassCard padding="p-8" animate={false}>
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center">
                  {activeTab === 'posts' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-txt-muted">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-txt-muted">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  )}
                </div>
                <p className="text-txt-muted text-sm">
                  {activeTab === 'posts' ? 'No posts yet' : 'No saved pins yet'}
                </p>
              </div>
            </GlassCard>
          </>
        ) : (
          <GlassCard padding="p-8" animate={false}>
            <p className="text-txt-muted text-sm text-center">User not found</p>
          </GlassCard>
        )}
      </div>
    </motion.div>
  );
}
