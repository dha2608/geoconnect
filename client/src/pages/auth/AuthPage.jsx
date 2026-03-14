import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login, register as registerUser, guestLogin, clearError } from '../../features/auth/authSlice';
import { authApi } from '../../api/authApi';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import compressImage from '../../utils/compressImage';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ─── Tab indicator spring ─────────────────────────────────────────────────────

const TAB_SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };

// ─── Content animation ───────────────────────────────────────────────────────

const contentVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    filter: 'blur(4px)',
    transition: { duration: 0.25 },
  }),
};

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    const result = await dispatch(login(data));
    if (login.fulfilled.match(result)) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm"
        >
          {error}
        </motion.div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    try {
      const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.85 });
      setAvatarFile(compressed);
    } catch {
      setAvatarFile(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data) => {
    const { confirmPassword, ...fields } = data;
    let payload;
    if (avatarFile) {
      payload = new FormData();
      payload.append('name', fields.name);
      payload.append('email', fields.email);
      payload.append('password', fields.password);
      payload.append('avatar', avatarFile);
    } else {
      payload = fields;
    }
    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Avatar picker */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative group">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-surface-divider
                       hover:border-accent-primary/50 transition-colors duration-200 flex items-center justify-center
                       bg-surface-hover cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            aria-label="Choose avatar"
          >
            <AnimatePresence mode="wait">
              {avatarPreview ? (
                <motion.img
                  key="preview"
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  className="flex flex-col items-center gap-1 text-txt-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-[10px]">Photo</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          {avatarPreview && (
            <motion.button
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={removeAvatar}
              className="absolute -top-1 -right-1 w-6 h-6 bg-accent-danger rounded-full flex items-center justify-center
                         text-white text-xs hover:bg-red-600 transition-colors shadow-lg"
              aria-label="Remove avatar"
            >
              x
            </motion.button>
          )}
        </div>
        <p className="text-xs text-txt-muted">Profile photo <span className="text-txt-muted/60">(optional)</span></p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <Input
        label="Full Name"
        placeholder="Your full name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Create a password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" loading={loading} className="w-full">
        Create Account
      </Button>
    </form>
  );
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'login', label: 'Sign In' },
  { id: 'register', label: 'Sign Up' },
];

export default function AuthPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);

  // OAuth loading states
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'github' | null

  // Determine initial tab from URL path
  const initialTab = location.pathname === '/register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [direction, setDirection] = useState(0);

  const from = location.state?.from?.pathname || '/';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  const switchTab = (tabId) => {
    if (tabId === activeTab) return;
    dispatch(clearError());
    setDirection(tabId === 'register' ? 1 : -1);
    setActiveTab(tabId);
    // Update URL without full navigation
    window.history.replaceState(null, '', tabId === 'register' ? '/register' : '/login');
  };

  const handleGuestLogin = async () => {
    const result = await dispatch(guestLogin());
    if (guestLogin.fulfilled.match(result)) {
      handleSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base relative overflow-hidden px-4 py-8">
      <div className="aurora-bg" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-2">
            GeoConnect
          </h1>
          <p className="text-txt-secondary text-sm">Discover places, connect with people</p>
        </div>

        <GlassCard className="space-y-5">
          {/* Tab bar */}
          <div className="relative flex rounded-xl bg-surface-hover border border-surface-divider p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 z-10 ${
                    isActive ? 'text-txt-primary' : 'text-txt-muted hover:text-txt-secondary'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="auth-tab-indicator"
                      className="absolute inset-0 rounded-lg glass border border-accent-primary/20 shadow-sm"
                      style={{ zIndex: -1 }}
                      transition={TAB_SPRING}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="relative overflow-hidden min-h-[280px]">
            <AnimatePresence mode="wait" custom={direction}>
              {activeTab === 'login' ? (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <LoginForm onSuccess={handleSuccess} />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  custom={direction}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <RegisterForm onSuccess={handleSuccess} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-surface-divider" />
            <span className="text-txt-muted text-xs">or continue with</span>
            <div className="flex-1 h-px bg-surface-divider" />
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              loading={oauthLoading === 'google'}
              disabled={!!oauthLoading}
              onClick={() => { setOauthLoading('google'); authApi.googleLogin(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </Button>
            <Button
              variant="ghost"
              loading={oauthLoading === 'github'}
              disabled={!!oauthLoading}
              onClick={() => { setOauthLoading('github'); authApi.githubLogin(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </Button>
          </div>

          {/* Guest */}
          <Button variant="ghost" onClick={handleGuestLogin} loading={loading} className="w-full">
            Continue as Guest
          </Button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
