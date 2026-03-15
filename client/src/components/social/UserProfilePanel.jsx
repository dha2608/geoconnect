import { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchUserProfile, clearProfile } from '../../features/users/userSlice';
import { closePanel } from '../../features/ui/uiSlice';
import { flyToLocation } from '../../features/map/mapSlice';
import Avatar from '../ui/Avatar';
import GlassCard from '../ui/GlassCard';
import { PanelSkeleton } from '../ui/Skeleton';
import FollowButton from './FollowButton';
import { getUserPosts } from '../../api/postApi';
import { getSavedPins } from '../../api/pinApi';
import { userApi } from '../../api/userApi';
import ReportModal from '../ui/ReportModal';

// ──────────────────────────────────────────────
// Category colour palette for saved-pin cards
// ──────────────────────────────────────────────
const CATEGORY_COLORS = {
  restaurant: '#ef4444',
  cafe:       '#f59e0b',
  bar:        '#8b5cf6',
  park:       '#10b981',
  museum:     '#3b82f6',
  hotel:      '#06b6d4',
  shopping:   '#ec4899',
  gym:        '#f97316',
  landmark:   '#eab308',
  other:      '#6b7280',
};

// ──────────────────────────────────────────────
// Framer Motion variants
// ──────────────────────────────────────────────
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ──────────────────────────────────────────────
// Skeleton shown while profile is loading
// ──────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Avatar + name block */}
      <div className="glass p-5 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-hover flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 bg-surface-hover rounded-lg w-2/3" />
            <div className="h-3 bg-surface-hover rounded w-1/2" />
            <div className="h-3 bg-surface-hover rounded w-1/3" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-surface-hover rounded w-full" />
          <div className="h-3 bg-surface-hover rounded w-4/5" />
        </div>
      </div>
      {/* Stats block */}
      <div className="glass p-4 rounded-2xl">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-7 bg-surface-hover rounded w-10" />
              <div className="h-3 bg-surface-hover rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Compact post card
// ──────────────────────────────────────────────
const PostCard = memo(function PostCard({ post }) {
  const date = post.createdAt
    ? format(new Date(post.createdAt), 'MMM d, yyyy')
    : '';
  const hasImage = Array.isArray(post.images) && post.images.length > 0;

  return (
    <motion.div variants={itemVariants} className="glass rounded-xl p-3.5 space-y-2">
      {post.text && (
        <p className="text-txt-secondary text-sm leading-relaxed line-clamp-3">
          {post.text}
        </p>
      )}

      {hasImage && (
        <div className="rounded-lg overflow-hidden h-32 bg-surface-hover">
          <img
            src={post.images[0]}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-0.5 text-txt-muted text-xs">
        {/* Like count */}
        <span className="flex items-center gap-1">
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {post.likes?.length ?? 0}
        </span>

        {/* Comment count */}
        <span className="flex items-center gap-1">
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {post.comments?.length ?? 0}
        </span>

        <span className="ml-auto">{date}</span>
      </div>
    </motion.div>
  );
});

// ──────────────────────────────────────────────
// Compact saved-pin card
// ──────────────────────────────────────────────
const PinCard = memo(function PinCard({ pin, onFly }) {
  const color  = CATEGORY_COLORS[pin.category] ?? CATEGORY_COLORS.other;
  const rating = typeof pin.averageRating === 'number'
    ? pin.averageRating.toFixed(1)
    : null;

  return (
    <motion.button
      variants={itemVariants}
      onClick={() => onFly(pin)}
      className="glass rounded-xl p-3.5 text-left w-full space-y-1.5 hover:bg-surface-hover transition-colors cursor-pointer"
    >
      {/* Title row */}
      <div className="flex items-start gap-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-[3px]"
          style={{ backgroundColor: color }}
        />
        <p className="text-txt-primary text-sm font-medium leading-snug">
          {pin.title}
        </p>
      </div>

      {/* Address */}
      {pin.address && (
        <p className="text-txt-muted text-xs truncate pl-5">{pin.address}</p>
      )}

      {/* Footer: category label + star rating */}
      <div className="flex items-center justify-between pl-5">
        <span className="text-txt-muted text-xs capitalize">{pin.category}</span>
        {rating && (
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {rating}
          </span>
        )}
      </div>
    </motion.button>
  );
});

// ──────────────────────────────────────────────
// Empty state shown when a tab has no data
// ──────────────────────────────────────────────
function TabEmpty({ tab }) {
  return (
    <GlassCard padding="p-8" animate={false}>
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center">
          {tab === 'posts' ? (
            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              className="text-txt-muted"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3"  y1="9"  x2="21" y2="9"  />
              <line x1="9"  y1="21" x2="9"  y2="9"  />
            </svg>
          ) : (
            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              className="text-txt-muted"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          )}
        </div>
        <p className="text-txt-muted text-sm">
          {tab === 'posts' ? 'No posts yet' : 'No saved pins yet'}
        </p>
      </div>
    </GlassCard>
  );
}

// ──────────────────────────────────────────────
// Tab bar config
// ──────────────────────────────────────────────
const TABS = [
  { id: 'posts', label: 'Posts'      },
  { id: 'saved', label: 'Saved Pins' },
];

// ──────────────────────────────────────────────
// Main panel
// ──────────────────────────────────────────────
export default function UserProfilePanel({ userId }) {
  const dispatch = useDispatch();
  const { profile, loading } = useSelector((state) => state.users);
  const { user: currentUser }  = useSelector((state) => state.auth);
  const { isMobile } = useSelector((state) => state.ui);

  const [activeTab,  setActiveTab]  = useState('posts');
  const [posts,      setPosts]      = useState([]);
  const [savedPins,  setSavedPins]  = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError,   setTabError]   = useState(null);
  const [isBlocked,  setIsBlocked]  = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // ── Fetch profile on mount, clear on unmount ──
  useEffect(() => {
    if (userId) dispatch(fetchUserProfile(userId));
    return () => { dispatch(clearProfile()); };
  }, [userId, dispatch]);

  // ── Check if user is blocked ──
  useEffect(() => {
    if (!userId || !currentUser?._id || userId === currentUser._id) return;
    setIsBlocked(currentUser.blockedUsers?.includes(userId) || false);
  }, [userId, currentUser]);

  // ── Block/Unblock handler ──
  const handleToggleBlock = useCallback(async () => {
    if (!userId || blockLoading) return;
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await userApi.unblockUser(userId);
        setIsBlocked(false);
        toast.success('User unblocked');
      } else {
        await userApi.blockUser(userId);
        setIsBlocked(true);
        toast.success('User blocked');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update block status');
    } finally {
      setBlockLoading(false);
    }
  }, [userId, isBlocked, blockLoading]);

  // ── Fetch tab data when the active tab or profile changes ──
  useEffect(() => {
    if (!userId || !profile) return;

    let cancelled = false;

    const fetchTabData = async () => {
      setTabLoading(true);
      setTabError(null);
      try {
        if (activeTab === 'posts') {
          const res = await getUserPosts(userId);
          if (!cancelled) setPosts(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
        } else {
          const res = await getSavedPins(userId);
          if (!cancelled) setSavedPins(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message ?? 'Failed to load data';
          setTabError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };

    fetchTabData();
    return () => { cancelled = true; };
  }, [activeTab, userId, profile]);

  // ── Fly map to pin location and close panel ──
  const handlePinFly = useCallback((pin) => {
    const [lng, lat] = pin.location.coordinates;
    dispatch(flyToLocation({ lat, lng, zoom: 16 }));
    dispatch(closePanel());
  }, [dispatch]);

  const isCurrentUser = currentUser?._id === userId;
  const isFollowing   = Array.isArray(currentUser?.following)
    ? currentUser.following.includes(userId)
    : false;

  const joinDate = profile?.createdAt
    ? format(new Date(profile.createdAt), 'MMMM yyyy')
    : null;

  // ── Responsive layout ──
  const motionProps = isMobile
    ? {
        initial:    { opacity: 0, y: 20 },
        animate:    { opacity: 1, y: 0  },
        exit:       { opacity: 0, y: 20 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial:    { x: -380 },
        animate:    { x: 0    },
        exit:       { x: -380 },
        transition: { type: 'spring', damping: 25, stiffness: 300 },
      };

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-20 glass overflow-y-auto'
    : 'fixed top-16 bottom-0 left-[72px] w-[380px] z-20 glass border-r border-accent-primary/10 overflow-y-auto';

  return (
    <>
    <motion.div
      {...motionProps}
      className={panelClass}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-surface-divider px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => dispatch(closePanel())}
          aria-label="Close profile"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
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
                  name={profile.name}
                  size="lg"
                  online={profile.isOnline}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-txt-primary text-xl leading-tight truncate">
                    {profile.name}
                  </h3>
                  {profile.email && (
                    <p className="text-txt-muted text-sm truncate mt-0.5">{profile.email}</p>
                  )}
                  {joinDate && (
                    <p className="text-txt-muted text-xs mt-1.5 flex items-center gap-1.5">
                      <svg
                        width="12" height="12" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2"  x2="16" y2="6"  />
                        <line x1="8"  y1="2"  x2="8"  y2="6"  />
                        <line x1="3"  y1="10" x2="21" y2="10" />
                      </svg>
                      Joined {joinDate}
                    </p>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="mt-4 text-txt-secondary text-sm leading-relaxed border-t border-surface-divider pt-4">
                  {profile.bio}
                </p>
              )}

              {!isCurrentUser && (
                <div className="mt-4 flex items-center gap-2">
                  <FollowButton userId={profile._id} isFollowing={isFollowing} size="md" />
                  <button
                    onClick={handleToggleBlock}
                    disabled={blockLoading}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 border ${
                      isBlocked
                        ? 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/20'
                        : 'border-surface-divider text-txt-muted hover:text-accent-danger hover:border-accent-danger/30 hover:bg-accent-danger/5'
                    } ${blockLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 border
                               border-surface-divider text-txt-muted hover:text-accent-warning hover:border-accent-warning/30 hover:bg-accent-warning/5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1 -mt-0.5">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Report
                  </button>
                </div>
              )}
            </GlassCard>

            {/* ── Stats row ── */}
            <GlassCard padding="p-4" animate={false}>
              <div className="grid grid-cols-3 divide-x divide-surface-divider">
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

            {/* ── Tab bar ── */}
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

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
              {tabLoading ? (
                /* Loading skeleton */
                <motion.div
                  key="tab-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PanelSkeleton />
                </motion.div>

              ) : tabError ? (
                /* Error state */
                <motion.div
                  key="tab-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard padding="p-6" animate={false}>
                    <p className="text-center text-sm text-red-400">{tabError}</p>
                  </GlassCard>
                </motion.div>

              ) : activeTab === 'posts' ? (
                posts.length === 0 ? (
                  /* Posts empty state */
                  <motion.div
                    key="posts-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TabEmpty tab="posts" />
                  </motion.div>
                ) : (
                  /* Posts list */
                  <motion.div
                    key="posts-list"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {Array.isArray(posts) && posts.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </motion.div>
                )

              ) : savedPins.length === 0 ? (
                /* Saved pins empty state */
                <motion.div
                  key="pins-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TabEmpty tab="saved" />
                </motion.div>
              ) : (
                /* Saved pins list */
                <motion.div
                  key="pins-list"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {savedPins.map((pin) => (
                    <PinCard key={pin._id} pin={pin} onFly={handlePinFly} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <GlassCard padding="p-8" animate={false}>
            <p className="text-txt-muted text-sm text-center">User not found</p>
          </GlassCard>
        )}
      </div>
    </motion.div>

    {/* ── Report modal ── */}
    {!isCurrentUser && (
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={userId}
      />
    )}
    </>
  );
}
