import { useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const ImagePlus = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><path d="M14 4h2"/><path d="M15 3v2"/></svg>
);
const MapPin = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const X = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const Loader2 = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const AlertCircle = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
import { createPost } from '../../features/posts/postSlice';
import { closeModal } from '../../features/ui/uiSlice';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CONTENT = 500;
const MAX_IMAGES = 6;

// ─── Validation Schema ───────────────────────────────────────────────────────

const schema = z.object({
  content: z
    .string()
    .min(1, 'Say something to post.')
    .max(MAX_CONTENT, `Max ${MAX_CONTENT} characters.`),
});

// ─── Image Preview Grid ───────────────────────────────────────────────────────

function PreviewGrid({ previews, onRemove }) {
  if (previews.length === 0) return null;

  const cols =
    previews.length === 1 ? 'grid-cols-1' :
    previews.length === 2 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className={`grid ${cols} gap-2 overflow-hidden`}
    >
      {previews.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.18 }}
          className="relative group rounded-xl overflow-hidden bg-white/5"
        >
          <img
            src={item.preview}
            alt={`Preview ${i + 1}`}
            className={`w-full object-cover ${previews.length === 1 ? 'max-h-48' : 'h-24'}`}
          />
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove image ${i + 1}`}
            className="absolute top-1.5 right-1.5 w-5 h-5 bg-base/80 backdrop-blur-sm text-txt-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-danger"
          >
            <X size={11} />
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Char Counter Arc ─────────────────────────────────────────────────────────

function CharCounter({ count, max }) {
  const pct = count / max;
  const radius = 9;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (1 - pct);
  const color =
    pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6';

  return (
    <div className="relative flex items-center justify-center w-6 h-6" aria-label={`${count}/${max} characters`}>
      <svg width="24" height="24" className="-rotate-90">
        <circle cx="12" cy="12" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="12" cy="12" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.15s, stroke 0.15s' }}
        />
      </svg>
      {pct >= 0.8 && (
        <span className="absolute text-[8px] font-body font-semibold" style={{ color }}>
          {max - count}
        </span>
      )}
    </div>
  );
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────

export default function CreatePostModal() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const modalOpen = useSelector((state) => state.ui.modalOpen);

  // Image state
  const [previews, setPreviews] = useState([]);    // [{ id, file, preview }]
  const fileInputRef = useRef(null);

  // Location state
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationData, setLocationData] = useState(null);   // { coordinates, locationName }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { content: '' },
  });

  const contentValue = watch('content') ?? '';
  const charCount = contentValue.length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (submitting) return;
    dispatch(closeModal());
    reset();
    setPreviews([]);
    setLocationEnabled(false);
    setLocationData(null);
    setLocationError(null);
    setSubmitError(null);
  }, [submitting, dispatch, reset]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    const slots = MAX_IMAGES - previews.length;
    const toProcess = files.slice(0, slots);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const id = `${Date.now()}-${Math.random()}`;
        setPreviews((prev) => [...prev, { id, file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const removePreview = (id) => {
    setPreviews((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setLocationData(null);
      setLocationError(null);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10_000,
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;
      setLocationData({
        coordinates: [longitude, latitude],
        locationName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      });
      setLocationEnabled(true);
    } catch (err) {
      setLocationError(
        err.code === 1
          ? 'Location permission denied.'
          : 'Could not detect location.'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('content', data.content);

      previews.forEach(({ file }) => formData.append('images', file));

      if (locationEnabled && locationData) {
        formData.append(
          'location',
          JSON.stringify({ type: 'Point', coordinates: locationData.coordinates })
        );
        formData.append('locationName', locationData.locationName);
      }

      await dispatch(createPost(formData)).unwrap();
      handleClose();
    } catch (err) {
      console.error('[CreatePostModal] createPost error:', err);
      setSubmitError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={modalOpen === 'createPost'}
      onClose={handleClose}
      title="Create Post"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* User row */}
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} name={user?.username} size="md" />
          <div>
            <p className="text-txt-primary font-semibold font-body text-sm leading-tight">
              {user?.username}
            </p>
            {locationEnabled && locationData && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-accent-primary" />
                <span className="text-txt-muted text-xs font-body">
                  {locationData.locationName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content textarea */}
        <div className="relative">
          <textarea
            {...register('content')}
            rows={5}
            placeholder="What's happening around you?"
            disabled={submitting}
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-txt-primary font-body text-sm
              placeholder:text-txt-muted outline-none resize-none transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              ${errors.content
                ? 'border-accent-danger/50 focus:border-accent-danger'
                : 'border-white/10 focus:border-accent-primary/40'
              }`}
          />
          {/* Char counter — bottom-right of textarea */}
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <CharCounter count={charCount} max={MAX_CONTENT} />
          </div>
        </div>

        {errors.content && (
          <p className="text-accent-danger text-xs font-body -mt-2 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.content.message}
          </p>
        )}

        {/* Image previews */}
        <AnimatePresence>
          {previews.length > 0 && (
            <PreviewGrid previews={previews} onRemove={removePreview} />
          )}
        </AnimatePresence>

        {/* Location error */}
        <AnimatePresence>
          {locationError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-accent-warning text-xs font-body flex items-center gap-1 -mt-2"
            >
              <AlertCircle size={12} />
              {locationError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit error */}
        <AnimatePresence>
          {submitError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-accent-danger text-xs font-body flex items-center gap-1 -mt-2"
            >
              <AlertCircle size={12} />
              {submitError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="flex items-center gap-1 pt-3 border-t border-white/5">
          {/* Image upload trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={previews.length >= MAX_IMAGES || submitting}
            title={previews.length >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : 'Add photos'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-txt-secondary hover:text-accent-primary hover:bg-accent-primary/10
              transition-all text-xs font-body disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImagePlus size={16} />
            <span>Photo</span>
            {previews.length > 0 && (
              <span className="bg-accent-primary/20 text-accent-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {previews.length}
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Location toggle */}
          <button
            type="button"
            onClick={handleLocationToggle}
            disabled={locationLoading || submitting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body transition-all
              disabled:opacity-40 disabled:cursor-not-allowed ${
              locationEnabled
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-txt-secondary hover:text-accent-primary hover:bg-accent-primary/10'
            }`}
          >
            {locationLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <MapPin size={15} />
            )}
            <span>{locationEnabled ? 'Location on' : 'Location'}</span>
          </button>

          <div className="flex-1" />

          {/* Post button */}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || charCount === 0 || charCount > MAX_CONTENT}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                Posting…
              </span>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

