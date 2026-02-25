import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { reviewApi } from '../../api/reviewApi';
import StarRating from './StarRating';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const MAX_CHARS = 600;

export default function ReviewForm({ pinId, onSuccess }) {
  const user = useSelector((state) => state.auth.user);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!rating) next.rating = 'Please select a star rating.';
    if (!text.trim()) next.text = 'Review text is required.';
    else if (text.trim().length < 10) next.text = 'Write at least 10 characters.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to write a review.');
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await reviewApi.createReview(pinId, {
        rating,
        text: text.trim(),
      });
      const newReview = res.data?.review ?? res.data;
      toast.success('Review submitted!');
      setRating(0);
      setText('');
      onSuccess?.(newReview);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to submit review. Please try again.';
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 text-center space-y-2"
      >
        <p className="text-txt-secondary text-sm">Sign in to write a review.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass rounded-xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar src={user.avatar} name={user.username} size="sm" />
        <div>
          <p className="text-sm font-semibold text-txt-primary font-heading">Write a Review</p>
          <p className="text-xs text-txt-muted">as {user.username}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Star Rating */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
            Your Rating
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={rating}
              onChange={(v) => {
                setRating(v);
                setErrors((e) => ({ ...e, rating: undefined }));
              }}
              size="lg"
            />
            {rating > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-accent-warning font-medium"
              >
                {['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'][rating]}
              </motion.span>
            )}
          </div>
          <AnimatePresence>
            {errors.rating && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-accent-danger"
              >
                {errors.rating}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
            Review
          </label>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setText(e.target.value);
                  setErrors((err) => ({ ...err, text: undefined }));
                }
              }}
              placeholder="Share your experience at this location…"
              rows={4}
              className={`
                w-full bg-elevated border rounded-xl px-4 py-3 text-sm text-txt-primary
                placeholder-txt-muted outline-none transition-all duration-150 resize-none
                focus:border-accent-primary/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.12)]
                ${errors.text ? 'border-accent-danger/50' : 'border-white/10'}
              `}
            />
            <span
              className={`absolute bottom-2.5 right-3 text-xs pointer-events-none ${
                text.length > MAX_CHARS * 0.9 ? 'text-accent-warning' : 'text-txt-muted'
              }`}
            >
              {text.length}/{MAX_CHARS}
            </span>
          </div>
          <AnimatePresence>
            {errors.text && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-accent-danger"
              >
                {errors.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Submit error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2.5 rounded-lg bg-accent-danger/10 border border-accent-danger/20 text-xs text-accent-danger"
            >
              {errors.submit}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          className="w-full"
          variant="primary"
        >
          {loading ? 'Submitting…' : 'Submit Review'}
        </Button>
      </form>
    </motion.div>
  );
}
