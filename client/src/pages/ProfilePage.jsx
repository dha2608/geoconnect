import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, toggleFollow } from '../features/users/userSlice';
import { setUser } from '../features/auth/authSlice';
import { formatDistanceToNow, format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { userApi } from '../api/userApi';

/* ─────────────────────────── animation variants ─────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const fadeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

/* ─────────────────────────── validation schema ───────────────────────────── */
const editSchema = z.object({
  username: z.string().min(2, 'At least 2 characters').max(30, 'Max 30 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(200, 'Max 200 characters').optional().or(z.literal('')),
});

/* ────────────────────────── helper sub-components ───────────────────────── */
const TABS = ['Posts', 'Pins', 'Reviews'];

function StatItem({ count, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 transition-opacity ${onClick ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}
    >
      <span className="text-xl font-heading font-bold text-txt-primary tabular-nums">{count ?? 0}</span>
      <span className="text-xs text-txt-muted">{label}</span>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="glass p-4 rounded-2xl space-y-3">
      <div className="h-36 bg-white/5 rounded-xl animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]" />
      <div className="space-y-2">
        <div className="h-3.5 bg-white/5 rounded w-4/5 animate-pulse" />
        <div className="h-3 bg-white/5 rounded w-2/5 animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <span className="text-5xl select-none">{icon}</span>
      <div className="text-center">
        <p className="text-txt-secondary font-medium">{title}</p>
        {message && <p className="text-sm text-txt-muted mt-1">{message}</p>}
      </div>
    </motion.div>
  );
}

function PostCard({ post }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.25)' }}
      transition={{ duration: 0.18 }}
      className="glass p-4 rounded-2xl cursor-pointer group space-y-3"
    >
      {post.images?.[0] && (
        <div className="h-36 rounded-xl overflow-hidden">
          <img src={post.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      {!post.images?.[0] && (
        <div className="h-36 rounded-xl bg-gradient-to-br from-accent-primary/10 to-accent-secondary/5 flex items-center justify-center">
          <span className="text-3xl opacity-40">📝</span>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-txt-primary line-clamp-2 leading-snug">{post.content}</p>
        <div className="flex items-center gap-3 text-xs text-txt-muted">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {post.likes?.length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {post.comments?.length ?? 0}
          </span>
          <span className="ml-auto">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PinCard({ pin }) {
  const categoryColors = {
    restaurant: 'text-accent-warning',
    park: 'text-accent-success',
    event: 'text-accent-secondary',
    default: 'text-accent-primary',
  };
  const color = categoryColors[pin.category?.toLowerCase()] || categoryColors.default;

  return (
    <motion.div
      whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.25)' }}
      transition={{ duration: 0.18 }}
      className="glass p-4 rounded-2xl cursor-pointer group space-y-3"
    >
      <div className="h-36 rounded-xl overflow-hidden bg-gradient-to-br from-accent-primary/10 to-accent-secondary/5 flex items-center justify-center relative">
        {pin.images?.[0] ? (
          <img src={pin.images[0]} alt={pin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 absolute inset-0" />
        ) : (
          <span className="text-4xl opacity-50">📍</span>
        )}
        <span className={`absolute top-2 right-2 text-xs font-mono font-medium px-2 py-0.5 rounded-lg bg-base/80 ${color} capitalize`}>
          {pin.category || 'pin'}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-txt-primary truncate">{pin.title}</p>
        <div className="flex items-center gap-3 text-xs text-txt-muted">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {pin.likes?.length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            {pin.savedBy?.length ?? 0}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function FollowListModal({ isOpen, title, users, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative glass w-full max-w-sm max-h-[70vh] overflow-y-auto p-6 rounded-2xl z-10"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-heading font-bold text-txt-primary">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-txt-muted hover:text-txt-primary transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {(!users || users.length === 0) ? (
              <p className="text-center text-txt-muted py-8 text-sm">Nobody here yet</p>
            ) : (
              <div className="space-y-3">
                {users.map((u, i) => {
                  const user = typeof u === 'object' ? u : { _id: u };
                  return (
                    <div key={user._id || i} className="flex items-center gap-3">
                      <Avatar name={user.username} src={user.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary truncate">{user.username || 'User'}</p>
                        {user.bio && <p className="text-xs text-txt-muted truncate">{user.bio}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── main component ─────────────────────────────── */
export default function ProfilePage() {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((s) => s.auth);
  const { profile, loading } = useSelector((s) => s.users);
  const allPosts = useSelector((s) => s.posts.posts);
  const allPins = useSelector((s) => s.pins.pins);

  const profileId = userId || currentUser?._id;
  const isOwnProfile = !userId || userId === currentUser?._id;

  const [activeTab, setActiveTab] = useState('Posts');
  const [editMode, setEditMode] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [statsModal, setStatsModal] = useState(null); // 'followers' | 'following'

  const fileInputRef = useRef();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { username: '', email: '', bio: '' },
  });

  const bioValue = watch('bio') ?? '';

  /* ── fetch profile ── */
  useEffect(() => {
    if (profileId) dispatch(fetchUserProfile(profileId));
  }, [profileId, dispatch]);

  /* ── seed form when profile loads ── */
  useEffect(() => {
    if (profile) {
      reset({ username: profile.username || '', email: profile.email || '', bio: profile.bio || '' });
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  }, [profile, reset]);

  /* ── derived ── */
  const isFollowing = currentUser?.following?.some(
    (id) => id === profile?._id || id?._id === profile?._id
  );
  const userPosts = allPosts.filter(
    (p) => (p.author?._id ?? p.author) === profile?._id
  );
  const userPins = allPins.filter(
    (p) => (p.creator?._id ?? p.creator) === profile?._id
  );

  /* ── handlers ── */
  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    await dispatch(toggleFollow(profile._id));
    setFollowLoading(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (data) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = new FormData();
      payload.append('username', data.username);
      payload.append('email', data.email);
      if (data.bio) payload.append('bio', data.bio);
      if (avatarFile) payload.append('avatar', avatarFile);

      const res = await userApi.updateProfile(payload);
      dispatch(setUser(res.data.user || res.data));
      await dispatch(fetchUserProfile(profileId));
      setEditMode(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setSaveError(null);
    if (profile) reset({ username: profile.username || '', email: profile.email || '', bio: profile.bio || '' });
  };

  /* ── loading / 404 guards ── */
  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="text-6xl">🔍</span>
        <div>
          <p className="text-txt-primary font-medium font-heading text-lg">User not found</p>
          <p className="text-txt-muted text-sm mt-1">This profile doesn't exist or was removed.</p>
        </div>
      </div>
    );
  }

  const displayUser = profile;

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto pb-20 space-y-0"
      >
        {/* ── Cover + Avatar ── */}
        <motion.div variants={itemVariants}>
          {/* Cover gradient */}
          <div className="h-52 rounded-2xl relative overflow-hidden bg-gradient-to-br from-accent-primary/25 via-panel to-accent-secondary/15 border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(59,130,246,0.2),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_10%_80%,rgba(6,182,212,0.12),transparent)]" />
            {/* Geometric accent nodes */}
            <div className="absolute top-5 right-10 w-2 h-2 rounded-full bg-accent-primary/40 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <div className="absolute top-14 right-24 w-1 h-1 rounded-full bg-accent-secondary/60" />
            <div className="absolute bottom-8 left-16 w-1.5 h-1.5 rounded-full bg-accent-primary/25" />
            <div className="absolute bottom-4 left-40 w-1 h-1 rounded-full bg-accent-secondary/30" />
            {/* Subtle grid lines */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>

          {/* Content below cover */}
          <div className="px-2">
            <div className="flex items-end justify-between -mt-14 mb-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-full ring-4 ring-base overflow-hidden relative">
                  {editMode ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full group relative block"
                    >
                      {avatarPreview || displayUser.avatar ? (
                        <img
                          src={avatarPreview || displayUser.avatar}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar name={displayUser.username} size="xl" className="w-28 h-28 text-3xl" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    </button>
                  ) : displayUser.avatar ? (
                    <img src={displayUser.avatar} alt={displayUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <Avatar name={displayUser.username} size="xl" className="w-28 h-28 text-3xl" />
                  )}
                </div>
                {/* Live-sharing indicator */}
                {displayUser.isLiveSharing && (
                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-accent-success ring-2 ring-base animate-pulse" />
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Action buttons */}
              <div className="pb-3 flex items-center gap-2">
                {isOwnProfile ? (
                  !editMode && (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit Profile
                    </Button>
                  )
                ) : (
                  <Button
                    variant={isFollowing ? 'ghost' : 'primary'}
                    size="sm"
                    loading={followLoading}
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Info / Edit Form */}
            <AnimatePresence mode="wait">
              {editMode ? (
                <motion.div key="edit" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                  <form onSubmit={handleSubmit(handleSave)} className="space-y-5 mt-2">
                    <AnimatePresence>
                      {saveError && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 px-3 py-2.5 rounded-xl"
                        >
                          {saveError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-txt-secondary">Username</label>
                        <input
                          {...register('username')}
                          autoComplete="username"
                          placeholder="your_username"
                          className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-txt-primary placeholder-txt-muted outline-none focus:border-accent-primary/50 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all duration-150"
                        />
                        {errors.username && <p className="text-xs text-accent-danger">{errors.username.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-txt-secondary">Email</label>
                        <input
                          {...register('email')}
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-txt-primary placeholder-txt-muted outline-none focus:border-accent-primary/50 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all duration-150"
                        />
                        {errors.email && <p className="text-xs text-accent-danger">{errors.email.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-txt-secondary">Bio</label>
                        <span className={`text-xs font-mono ${bioValue.length > 180 ? 'text-accent-warning' : 'text-txt-muted'}`}>
                          {bioValue.length}/200
                        </span>
                      </div>
                      <textarea
                        {...register('bio')}
                        rows={3}
                        maxLength={200}
                        placeholder="Tell people a little about yourself..."
                        className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-txt-primary placeholder-txt-muted outline-none focus:border-accent-primary/50 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all duration-150 resize-none leading-relaxed"
                      />
                      {errors.bio && <p className="text-xs text-accent-danger">{errors.bio.message}</p>}
                    </div>

                    {avatarPreview && (
                      <p className="text-xs text-accent-success flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        New avatar selected
                      </p>
                    )}

                    <div className="flex gap-3">
                      <Button type="submit" size="sm" loading={saving}>
                        Save Changes
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="view" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 mt-2">
                  {/* Name + handle */}
                  <div>
                    <h1 className="text-2xl font-heading font-bold text-txt-primary leading-tight">
                      {displayUser.username}
                    </h1>
                    <p className="text-sm text-txt-muted">@{displayUser.username?.toLowerCase().replace(/\s+/g, '_')}</p>
                  </div>

                  {/* Bio */}
                  {displayUser.bio && (
                    <p className="text-sm text-txt-secondary leading-relaxed max-w-lg">{displayUser.bio}</p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-txt-muted">
                    {displayUser.location?.city && (
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {displayUser.location.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Joined {displayUser.createdAt ? format(new Date(displayUser.createdAt), 'MMMM yyyy') : 'recently'}
                    </span>
                    {displayUser.isLiveSharing && (
                      <span className="flex items-center gap-1.5 text-accent-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
                        Live sharing
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 pt-1">
                    <StatItem count={userPosts.length} label="Posts" />
                    <div className="w-px h-8 bg-white/10" />
                    <StatItem
                      count={displayUser.followers?.length}
                      label="Followers"
                      onClick={() => setStatsModal('followers')}
                    />
                    <div className="w-px h-8 bg-white/10" />
                    <StatItem
                      count={displayUser.following?.length}
                      label="Following"
                      onClick={() => setStatsModal('following')}
                    />
                    {displayUser.savedPins?.length > 0 && (
                      <>
                        <div className="w-px h-8 bg-white/10" />
                        <StatItem count={displayUser.savedPins.length} label="Saved" />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        {!editMode && (
          <motion.div variants={itemVariants} className="mt-8">
            {/* Tab bar */}
            <div className="flex border-b border-white/8 mb-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-3.5 text-sm font-medium transition-colors select-none ${
                    activeTab === tab ? 'text-txt-primary' : 'text-txt-muted hover:text-txt-secondary'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'Posts' && (
                <motion.div key="posts" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                  {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : userPosts.length === 0 ? (
                    <EmptyState icon="📝" title="No posts yet" message={isOwnProfile ? 'Share your first post on the map!' : `${displayUser.username} hasn't posted yet.`} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {userPosts.map((post) => <PostCard key={post._id} post={post} />)}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'Pins' && (
                <motion.div key="pins" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                  {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : userPins.length === 0 ? (
                    <EmptyState icon="📍" title="No pins created" message={isOwnProfile ? 'Drop your first pin on the map!' : `${displayUser.username} hasn't created any pins yet.`} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {userPins.map((pin) => <PinCard key={pin._id} pin={pin} />)}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'Reviews' && (
                <motion.div key="reviews" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                  <EmptyState
                    icon="⭐"
                    title="No reviews yet"
                    message={isOwnProfile ? 'Visit a place and leave your first review!' : `${displayUser.username} hasn't reviewed any places yet.`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* ── Followers / Following modal ── */}
      <FollowListModal
        isOpen={statsModal === 'followers'}
        title={`Followers · ${displayUser?.followers?.length ?? 0}`}
        users={displayUser?.followers}
        onClose={() => setStatsModal(null)}
      />
      <FollowListModal
        isOpen={statsModal === 'following'}
        title={`Following · ${displayUser?.following?.length ?? 0}`}
        users={displayUser?.following}
        onClose={() => setStatsModal(null)}
      />
    </>
  );
}
