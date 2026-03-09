import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, setUser } from '../features/auth/authSlice';
import { setMapStyle } from '../features/ui/uiSlice';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { userApi } from '../api/userApi';
import API from '../api/axios';
import toast from 'react-hot-toast';

/* ─────────────────────────── animation variants ─────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const collapseVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: 'auto', marginTop: 16, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } },
};

/* ─────────────────────────── validation schemas ─────────────────────────── */
const profileSchema = z.object({
  username: z.string().min(2, 'At least 2 characters').max(30, 'Max 30 characters'),
  email: z.string().email('Invalid email'),
  bio: z.string().max(200, 'Max 200 characters').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Enter your current password'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/* ─────────────────────────── Toggle Switch ──────────────────────────────── */
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'bg-elevated border border-white/15'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md flex-shrink-0
          ${checked ? 'bg-white left-[calc(100%-1.375rem)]' : 'bg-txt-muted left-0.5'}`}
      />
    </button>
  );
}

/* ─────────────────────────── Toggle Row ─────────────────────────────────── */
function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${disabled ? 'text-txt-muted' : 'text-txt-primary'}`}>{label}</p>
        {description && <p className="text-xs text-txt-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

/* ─────────────────────────── Section Header ─────────────────────────────── */
function SectionHeader({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-heading font-semibold text-txt-primary">{title}</h2>
        {description && <p className="text-xs text-txt-muted mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Map Style Option ───────────────────────────── */
const MAP_STYLES = [
  { id: 'dark', label: 'Dark', gradient: 'from-[#0d1117] to-[#1a2332]', accent: 'bg-accent-primary/40' },
  { id: 'satellite', label: 'Satellite', gradient: 'from-[#1a3a1a] to-[#0d2a0d]', accent: 'bg-accent-success/40' },
  { id: 'street', label: 'Street', gradient: 'from-[#2a2a1a] to-[#3a3a20]', accent: 'bg-accent-warning/40' },
];

/* ─────────────────────────── Delete Confirm Modal ───────────────────────── */
function DeleteModal({ isOpen, onClose, onConfirm, loading }) {
  const [confirmText, setConfirmText] = useState('');
  const canConfirm = confirmText === 'DELETE';

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="relative glass border border-accent-danger/20 w-full max-w-md p-6 rounded-2xl z-10 shadow-[0_0_60px_rgba(239,68,68,0.1)]"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Warning icon */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-txt-primary">Delete Account</h3>
                <p className="text-xs text-txt-muted">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-txt-secondary leading-relaxed">
                Deleting your account will permanently remove all your data — posts, pins, messages, reviews, and followers. This is <span className="text-accent-danger font-medium">irreversible</span>.
              </p>

              <div className="p-3 rounded-xl bg-accent-danger/5 border border-accent-danger/15 space-y-2">
                <p className="text-xs text-txt-muted">Type <span className="font-mono text-accent-danger font-bold">DELETE</span> to confirm</p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2.5 text-sm text-txt-primary font-mono placeholder-txt-muted outline-none focus:border-accent-danger/50 transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  disabled={!canConfirm}
                  loading={loading}
                  onClick={onConfirm}
                >
                  Delete Forever
                </Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── main component ─────────────────────────────── */
export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isGuest } = useSelector((s) => s.auth);
  const { mapStyle } = useSelector((s) => s.ui);

  const fileInputRef = useRef();
  const saveTimeoutRef = useRef(null);
  const settingsLoaded = useRef(false);

  /* ── account form ── */
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const { register: regProfile, handleSubmit: submitProfile, watch: watchProfile, formState: { errors: profileErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: user?.username || '', email: user?.email || '', bio: user?.bio || '' },
  });
  const bioValue = watchProfile('bio') ?? '';

  /* ── password form ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);

  const { register: regPw, handleSubmit: submitPw, reset: resetPw, formState: { errors: pwErrors } } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  /* ── privacy toggles ── */
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    nearbyDiscovery: true,
    publicProfile: true,
  });

  /* ── notification toggles ── */
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    newFollower: true,
    nearbyEvent: true,
  });

  /* ── appearance ── */
  const [distanceUnit, setDistanceUnit] = useState('km');

  /* ── settings sync ── */
  useEffect(() => {
    if (isGuest) return;
    userApi.getSettings()
      .then((res) => {
        const s = res.data.settings;
        if (s.privacy) setPrivacy(s.privacy);
        if (s.notifications) setNotifications(s.notifications);
        if (s.appearance?.mapStyle) dispatch(setMapStyle(s.appearance.mapStyle));
        if (s.appearance?.distanceUnit) setDistanceUnit(s.appearance.distanceUnit);
        settingsLoaded.current = true;
      })
      .catch(() => {
        settingsLoaded.current = true; // allow saves even if fetch fails
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = (patch) => {
    if (isGuest || !settingsLoaded.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await userApi.updateSettings(patch);
      } catch {
        toast.error('Failed to save settings');
      }
    }, 500);
  };

  /* ── danger zone ── */
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  /* ── handlers ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (data) => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('email', data.email);
      if (data.bio) formData.append('bio', data.bio);
      if (avatarFile) formData.append('avatar', avatarFile);
      const res = await userApi.updateProfile(formData);
      dispatch(setUser(res.data.user || res.data));
      setProfileSuccess(true);
      setAvatarFile(null);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (data) => {
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await API.put('/auth/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwSuccess(true);
      resetPw();
      setTimeout(() => {
        setPwSuccess(false);
        setShowPasswordForm(false);
      }, 2500);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await API.delete('/users/me');
      localStorage.removeItem('accessToken');
      dispatch({ type: 'auth/logout/fulfilled' });
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Delete account failed:', err);
      setDeleteLoading(false);
      setDeleteModal(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const togglePrivacy = (key) => {
    setPrivacy((p) => {
      const next = { ...p, [key]: !p[key] };
      saveSettings({ privacy: next });
      return next;
    });
  };

  const toggleNotif = (key) => {
    setNotifications((n) => {
      const next = { ...n, [key]: !n[key] };
      saveSettings({ notifications: next });
      return next;
    });
  };

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto pb-20 space-y-5 px-1"
      >
        {/* ── Page title ── */}
        <motion.div variants={sectionVariants}>
          <h1 className="text-3xl font-heading font-bold text-txt-primary">Settings</h1>
          <p className="text-sm text-txt-muted mt-1">Manage your account and preferences</p>
        </motion.div>

        {/* ══════════════════ 1. ACCOUNT ══════════════════ */}
        <motion.div variants={sectionVariants}>
          <GlassCard animate={false} padding="p-6">
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              title="Account"
              description="Update your public profile information"
            />

            <form onSubmit={submitProfile(handleSaveProfile)} className="space-y-5">
              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => !isGuest && fileInputRef.current?.click()}
                  disabled={isGuest}
                  className={`relative group flex-shrink-0 ${isGuest ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-accent-primary/20 group-hover:ring-accent-primary/50 transition-all duration-200">
                    {avatarPreview || user?.avatar ? (
                      <img src={avatarPreview || user.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar name={user?.username} size="xl" className="w-20 h-20 text-2xl" />
                    )}
                  </div>
                  {!isGuest && (
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-txt-primary">Profile photo</p>
                  <p className="text-xs text-txt-muted mt-0.5">JPG, PNG or GIF · Max 5MB</p>
                  {avatarPreview && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-accent-success mt-1.5 flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      New photo selected
                    </motion.p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Username"
                  placeholder="your_username"
                  disabled={isGuest}
                  error={profileErrors.username?.message}
                  {...regProfile('username')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  disabled={isGuest}
                  error={profileErrors.email?.message}
                  {...regProfile('email')}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-txt-secondary">Bio</label>
                  <span className={`text-xs font-mono ${bioValue.length > 180 ? 'text-accent-warning' : 'text-txt-muted'}`}>
                    {bioValue.length}/200
                  </span>
                </div>
                <textarea
                  {...regProfile('bio')}
                  rows={3}
                  maxLength={200}
                  placeholder="Tell the world a little about yourself..."
                  disabled={isGuest}
                  className="w-full bg-elevated border border-white/10 rounded-xl px-4 py-3 text-sm text-txt-primary placeholder-txt-muted outline-none focus:border-accent-primary/50 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all duration-150 resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {profileErrors.bio && <p className="text-xs text-accent-danger">{profileErrors.bio.message}</p>}
              </div>

              <AnimatePresence>
                {profileError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 px-3 py-2.5 rounded-xl">
                    {profileError}
                  </motion.p>
                )}
                {profileSuccess && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-accent-success bg-accent-success/10 border border-accent-success/20 px-3 py-2.5 rounded-xl flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Profile updated successfully!
                  </motion.p>
                )}
              </AnimatePresence>

              {isGuest ? (
                <p className="text-xs text-txt-muted bg-elevated rounded-xl px-3 py-2.5 border border-white/8">
                  🔒 Create an account to edit your profile
                </p>
              ) : (
                <Button type="submit" loading={profileSaving} size="sm">
                  Save Changes
                </Button>
              )}
            </form>
          </GlassCard>
        </motion.div>

        {/* ══════════════════ 2. PRIVACY ══════════════════ */}
        <motion.div variants={sectionVariants}>
          <GlassCard animate={false} padding="p-6">
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              title="Privacy"
              description="Control who can see and interact with you"
            />
            <div className="divide-y divide-white/6">
              <ToggleRow
                label="Share location with followers"
                description="Followers can see your approximate location on the map"
                checked={privacy.shareLocation}
                onChange={() => togglePrivacy('shareLocation')}
                disabled={isGuest}
              />
              <ToggleRow
                label="Allow nearby user discovery"
                description="Users near your location can find your profile"
                checked={privacy.nearbyDiscovery}
                onChange={() => togglePrivacy('nearbyDiscovery')}
                disabled={isGuest}
              />
              <ToggleRow
                label="Public profile"
                description="Anyone can view your profile, posts, and pins"
                checked={privacy.publicProfile}
                onChange={() => togglePrivacy('publicProfile')}
                disabled={isGuest}
              />
            </div>
          </GlassCard>
        </motion.div>

        {/* ══════════════════ 3. NOTIFICATIONS ══════════════════ */}
        <motion.div variants={sectionVariants}>
          <GlassCard animate={false} padding="p-6">
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
              title="Notifications"
              description="Choose what you want to hear about"
            />
            <div className="divide-y divide-white/6">
              <ToggleRow
                label="Push notifications"
                description="Receive real-time alerts in your browser"
                checked={notifications.push}
                onChange={() => toggleNotif('push')}
              />
              <ToggleRow
                label="Email notifications"
                description="Get activity summaries to your email"
                checked={notifications.email}
                onChange={() => toggleNotif('email')}
                disabled={isGuest}
              />
              <ToggleRow
                label="New follower alerts"
                description="Notify you when someone follows your profile"
                checked={notifications.newFollower}
                onChange={() => toggleNotif('newFollower')}
              />
              <ToggleRow
                label="Nearby event alerts"
                description="Get notified about events happening near you"
                checked={notifications.nearbyEvent}
                onChange={() => toggleNotif('nearbyEvent')}
              />
            </div>
          </GlassCard>
        </motion.div>

        {/* ══════════════════ 4. APPEARANCE ══════════════════ */}
        <motion.div variants={sectionVariants}>
          <GlassCard animate={false} padding="p-6">
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>}
              title="Appearance"
              description="Personalise your map and display preferences"
            />

            {/* Map style */}
            <div className="mb-6">
              <p className="text-sm font-medium text-txt-secondary mb-3">Map Style</p>
              <div className="grid grid-cols-3 gap-3">
                {MAP_STYLES.map((style) => (
                  <motion.button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      dispatch(setMapStyle(style.id));
                      saveSettings({ appearance: { mapStyle: style.id, distanceUnit } });
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer ${
                      mapStyle === style.id
                        ? 'border-accent-primary shadow-[0_0_16px_rgba(59,130,246,0.3)]'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    {/* Preview thumbnail */}
                    <div className={`h-20 bg-gradient-to-br ${style.gradient} relative flex items-end justify-end p-2`}>
                      {/* Fake map roads */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                      </div>
                      {/* Pin dot */}
                      <div className={`w-3 h-3 rounded-full ${style.accent} ring-1 ring-white/30`} />
                      {mapStyle === style.id && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="py-2 px-1 bg-elevated/60">
                      <p className={`text-xs font-medium text-center ${mapStyle === style.id ? 'text-accent-primary' : 'text-txt-muted'}`}>
                        {style.label}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Distance unit */}
            <div>
              <p className="text-sm font-medium text-txt-secondary mb-3">Distance Unit</p>
              <div className="flex gap-3">
                {['km', 'miles'].map((unit) => (
                  <motion.button
                    key={unit}
                    type="button"
                    onClick={() => {
                      setDistanceUnit(unit);
                      saveSettings({ appearance: { mapStyle, distanceUnit: unit } });
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer ${
                      distanceUnit === unit
                        ? 'bg-accent-primary/10 border-accent-primary/50 text-accent-primary shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-elevated border-white/10 text-txt-muted hover:border-white/25 hover:text-txt-secondary'
                    }`}
                  >
                    {unit === 'km' ? 'Kilometers (km)' : 'Miles (mi)'}
                  </motion.button>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ══════════════════ 5. DANGER ZONE ══════════════════ */}
        <motion.div variants={sectionVariants}>
          <GlassCard animate={false} padding="p-6" className="border-accent-danger/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]">
            <SectionHeader
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              title="Danger Zone"
              description="Irreversible account actions — proceed with care"
            />

            <div className="space-y-3">
              {/* ── Change Password ── */}
              {!isGuest && (
                <div className="border border-white/8 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm((p) => !p)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      <div>
                        <p className="text-sm font-medium text-txt-primary">Change Password</p>
                        <p className="text-xs text-txt-muted">Update your login credentials</p>
                      </div>
                    </div>
                    <motion.svg
                      animate={{ rotate: showPasswordForm ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </motion.svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {showPasswordForm && (
                      <motion.div
                        variants={collapseVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{ overflow: 'hidden' }}
                      >
                        <form onSubmit={submitPw(handleChangePassword)} className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
                          <AnimatePresence>
                            {pwError && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 px-3 py-2.5 rounded-xl">
                                {pwError}
                              </motion.p>
                            )}
                            {pwSuccess && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-accent-success bg-accent-success/10 border border-accent-success/20 px-3 py-2.5 rounded-xl flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                Password updated successfully!
                              </motion.p>
                            )}
                          </AnimatePresence>
                          <Input
                            label="Current Password"
                            type="password"
                            placeholder="Your current password"
                            error={pwErrors.currentPassword?.message}
                            {...regPw('currentPassword')}
                          />
                          <Input
                            label="New Password"
                            type="password"
                            placeholder="Min. 8 characters"
                            error={pwErrors.newPassword?.message}
                            {...regPw('newPassword')}
                          />
                          <Input
                            label="Confirm New Password"
                            type="password"
                            placeholder="Repeat new password"
                            error={pwErrors.confirmPassword?.message}
                            {...regPw('confirmPassword')}
                          />
                          <div className="flex gap-3">
                            <Button type="submit" size="sm" loading={pwSaving}>
                              Update Password
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => { setShowPasswordForm(false); resetPw(); setPwError(null); }}
                              disabled={pwSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Log Out ── */}
              <div className="flex items-center justify-between px-4 py-3.5 border border-white/8 rounded-xl">
                <div className="flex items-center gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <div>
                    <p className="text-sm font-medium text-txt-primary">Log Out</p>
                    <p className="text-xs text-txt-muted">Sign out of your current session</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} loading={logoutLoading}>
                  Log Out
                </Button>
              </div>

              {/* ── Delete Account ── */}
              {!isGuest && (
                <div className="flex items-center justify-between px-4 py-3.5 border border-accent-danger/20 rounded-xl bg-accent-danger/[0.03]">
                  <div className="flex items-center gap-3">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    <div>
                      <p className="text-sm font-medium text-accent-danger">Delete Account</p>
                      <p className="text-xs text-txt-muted">Permanently delete all your data</p>
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ── Delete confirmation modal ── */}
      <DeleteModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />
    </>
  );
}
