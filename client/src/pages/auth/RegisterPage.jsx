import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { register as registerUser } from '../../features/auth/authSlice';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import compressImage from '../../utils/compressImage';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    // Compress for upload
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

    // Build FormData if avatar present, otherwise plain object
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
    if (registerUser.fulfilled.match(result)) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base relative overflow-hidden px-4">
      <div className="aurora-bg" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-2">
            GeoConnect
          </h1>
          <p className="text-txt-secondary text-sm">Join the community</p>
        </div>

        <GlassCard className="space-y-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-txt-primary">Create account</h2>
            <p className="text-txt-secondary text-sm mt-1">Start exploring and connecting</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-3">
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

                {/* Remove button */}
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
                    ×
                  </motion.button>
                )}
              </div>
              <p className="text-xs text-txt-muted">Add a profile photo <span className="text-txt-muted/60">(optional)</span></p>
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

          <p className="text-center text-sm text-txt-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-primary hover:text-blue-400 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
