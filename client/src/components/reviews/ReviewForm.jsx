import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { reviewApi } from '../../api/reviewApi';
import useRequireAuth from '../../hooks/useRequireAuth';
import StarRating from './StarRating';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const MAX_CHARS = 600;
const MAX_PHOTOS = 4;

/* ─── Icons ─────────────────────────────────────────────────────────── */
function ImageIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function XIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function ReviewForm({ pinId, onSuccess }) {
  const user = useSelector((state) => state.auth.user);
  const isGuest = useSelector((state) => state.auth.isGuest);
  const requireAuth = useRequireAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]); // File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // string[]
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const validate = () => {
    const next = {};
    if (!rating) next.rating = 'Please select a star rating.';
    if (!text.trim()) next.text = 'Review text is required.';
    else if (text.trim().length < 10) next.text = 'Write at least 10 characters.';
    return next;
  };

  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed.`);
    }

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requireAuth('write reviews')) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('text', text.trim());
      photos.forEach((f) => formData.append('photos', f));

      const res = await reviewApi.createReview(pinId, formData);
      const newReview = res.data?.review ?? res.data;
      toast.success('Review submitted!');
      setRating(0);
      setText('');
      // Clean up photo previews
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos([]);
      setPhotoPreviews([]);
      onSuccess?.(newReview);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to submit review. Please try again.';
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!user || isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-5 text-center space-y-2"
      >
        <p className="text-txt-secondary text-sm">
          {isGuest ? 'Create an account to write reviews. Guest accounts have limited access.' : 'Sign in to write a review.'}
        </p>
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
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <div>
          <p className="text-sm font-semibold text-txt-primary font-heading">Write a Review</p>
          <p className="text-xs text-txt-muted">as {user.name}</p>
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
                ${errors.text ? 'border-accent-danger/50' : 'border-surface-divider'}
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

        {/* Photo Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
              Photos <span className="normal-case text-txt-muted">(optional, max {MAX_PHOTOS})</span>
            </label>
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Add photos
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddPhotos}
            className="hidden"
          />

          {/* Photo previews */}
          <AnimatePresence>
            {photoPreviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 flex-wrap"
              >
                {photoPreviews.map((src, i) => (
                  <motion.div
                    key={src}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative w-16 h-16 rounded-lg overflow-hidden group/photo"
                  >
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover/photo:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-divider hover:border-accent-primary/40 flex items-center justify-center text-txt-muted hover:text-accent-primary transition-colors"
                  >
                    <span className="text-lg">+</span>
                  </button>
                )}
              </motion.div>
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
