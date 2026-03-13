import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authApi } from '../../api/authApi';

const schema = z.object({
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password: data.password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-base">
        <div className="aurora-bg" />
        <GlassCard padding="p-6" className="max-w-md w-full relative z-10 text-center">
          <p className="text-sm text-accent-danger mb-4">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-sm text-accent-primary hover:underline">Request a new reset link</Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-base">
      <div className="aurora-bg" />
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            New Password
          </h1>
          <p className="text-sm text-txt-muted mt-2">Choose a strong password for your account</p>
        </div>

        <GlassCard padding="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent-success/10 border border-accent-success/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm text-txt-primary">Password reset successfully!</p>
              <Link to="/login" className="inline-block text-sm text-accent-primary hover:underline">Go to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <p className="text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 px-3 py-2.5 rounded-xl">
                  {error}
                </p>
              )}
              <Input
                label="New Password"
                type="password"
                placeholder="Min. 6 characters"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat new password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" loading={loading} className="w-full">
                Reset Password
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
