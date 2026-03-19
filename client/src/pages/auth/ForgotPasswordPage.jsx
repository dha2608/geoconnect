import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authApi } from '../../api/authApi';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-base">
      <div className="aurora-bg" />
      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-sm text-txt-muted mt-2">Enter your email and we'll send you a reset link</p>
        </div>

        <GlassCard padding="p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent-success/10 border border-accent-success/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm text-txt-primary">If an account exists with that email, a password reset link has been sent.</p>
              <p className="text-xs text-txt-muted">Check your inbox and spam folder.</p>
              <Link to="/login" className="text-sm text-violet-400 hover:text-violet-300 hover:underline">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <p className="text-sm text-accent-danger bg-accent-danger/10 border border-accent-danger/20 px-3 py-2.5 rounded-xl">
                  {error}
                </p>
              )}
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
              <p className="text-center text-sm text-txt-muted">
                Remember your password?{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 hover:underline">Log in</Link>
              </p>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
