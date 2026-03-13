import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { updatePost } from '../../features/posts/postSlice';
import { closeModal } from '../../features/ui/uiSlice';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { compressImages } from '../../utils/compressImage';

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const ImagePlus = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
const X = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const Loader2 = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const AlertCircle = ({ size = 24, className, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_CONTENT = 500;
const MAX_IMAGES  = 6;

// ─── Validation Schema ───────────────────────────────────────────────────────
const schema = z.object({
  content: z
    .string()
    .min(1,          'Say something to post.')
    .max(MAX_CONTENT, `Max ${MAX_CONTENT} characters.`),
});

// ─── Char Counter Arc ─────────────────────────────────────────────────────────
function CharCounter({ count, max }) {
  const pct    = count / max;
  const radius = 9;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ * (1 - pct);
  const color  = pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6';

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

// ─── Mixed Image Preview Grid ─────────────────────────────────────────────────
// Handles both existing URL strings and new {id, file, preview} objects
function PreviewGrid({ existingUrls, newItems, onRemoveExisting, onRemoveNew }) {
  const hasExisting = existingUrls.length > 0;
  const hasNew      = newItems.length > 0;
  if (!hasExisting && !hasNew) return null;

  return (
    <div className="space-y-2">
      {/* Existing images */}
      {hasExisting && (
        <div className="space-y-1">
          <p className="text-[11px] text-txt-muted uppercase tracking-wide">Current photos</p>
          <div className={`grid gap-2 ${existingUrls.length === 1 ? 'grid-cols-1' : existingUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {existingUrls.map((url, i) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                className="relative group rounded-xl overflow-hidden bg-surface-hover"
              >
                <img
                  src={url}
                  alt={`Current photo ${i + 1}`}
                  className={`w-full object-cover ${existingUrls.length === 1 ? 'max-h-48' : 'h-24'}`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveExisting(i)}
                  aria-label={`Remove current photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-base/80 backdrop-blur-sm text-txt-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-danger"
                >
                  <X size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New uploads */}
      {hasNew && (
        <div className="space-y-1">
          <p className="text-[11px] text-txt-muted uppercase tracking-wide">New photos</p>
          <div className={`grid gap-2 ${newItems.length === 1 ? 'grid-cols-1' : newItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {newItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                className="relative group rounded-xl overflow-hidden bg-surface-hover ring-1 ring-accent-primary/25"
              >
                <img
                  src={item.preview}
                  alt={`New photo ${i + 1}`}
                  className={`w-full object-cover ${newItems.length === 1 ? 'max-h-48' : 'h-24'}`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveNew(item.id)}
                  aria-label={`Remove new photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-base/80 backdrop-blur-sm text-txt-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-danger"
                >
                  <X size={11} />
                </button>
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-accent-primary/80 text-white rounded px-1.5 py-0.5">
                  new
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditPostModal ─────────────────────────────────────────────────────────────
export default function EditPostModal() {
  const dispatch  = useDispatch();
  const user      = useSelector((state) => state.auth.user);
  const modalOpen = useSelector((state) => state.ui.modalOpen);
  const modalData = useSelector((state) => state.ui.modalData);

  const isOpen = modalOpen === 'editPost';
  const post   = modalData;

  // Existing image URLs from the post
  const [existingUrls, setExistingUrls] = useState([]);
  // New file uploads: [{ id, file, preview }]
  const [newItems, setNewItems] = useState([]);

  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState(null);
  const fileInputRef = useRef(null);

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
  const charCount    = contentValue.length;

  /* Sync form state when modal opens with a new post */
  useEffect(() => {
    if (isOpen && post?._id) {
      reset({ content: post.content ?? '' });
      setExistingUrls(post.images ?? []);
      setNewItems([]);
      setSubmitError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post?._id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (submitting) return;
    dispatch(closeModal());
    reset();
    setExistingUrls([]);
    setNewItems([]);
    setSubmitError(null);
  }, [submitting, dispatch, reset]);

  const handleFileChange = (e) => {
    const files     = Array.from(e.target.files ?? []);
    const totalNow  = existingUrls.length + newItems.length;
    const slots     = MAX_IMAGES - totalNow;
    const toProcess = files.slice(0, slots);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const id = `${Date.now()}-${Math.random()}`;
        setNewItems((prev) => [...prev, { id, file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeExisting = (idx) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNew = (id) => {
    setNewItems((prev) => prev.filter((p) => p.id !== id));
  };

  const onSubmit = async (data) => {
    if (!post?._id) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('content', data.content);

      // Tell backend which existing images to keep
      existingUrls.forEach((url) => formData.append('keepImages', url));
      // Compress and append new files
      const files = newItems.map(({ file }) => file);
      const compressed = await compressImages(files);
      compressed.forEach((file) => formData.append('images', file));

      await dispatch(updatePost({ id: post._id, data: formData })).unwrap();
      toast.success('✏️ Post updated!');
      handleClose();
    } catch (err) {
      console.error('[EditPostModal] updatePost error:', err);
      setSubmitError('Failed to update post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalImages = existingUrls.length + newItems.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Post"
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
            <p className="text-txt-muted text-xs font-body mt-0.5">Editing post</p>
          </div>
        </div>

        {/* Content textarea */}
        <div className="relative">
          <textarea
            {...register('content')}
            rows={5}
            placeholder="What's happening around you?"
            disabled={submitting}
            className={`w-full bg-surface-hover border rounded-xl px-4 py-3 text-txt-primary font-body text-sm
              placeholder:text-txt-muted outline-none resize-none transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              ${errors.content
                ? 'border-accent-danger/50 focus:border-accent-danger'
                : 'border-surface-divider focus:border-accent-primary/40'
              }`}
          />
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
          {(existingUrls.length > 0 || newItems.length > 0) && (
            <PreviewGrid
              existingUrls={existingUrls}
              newItems={newItems}
              onRemoveExisting={removeExisting}
              onRemoveNew={removeNew}
            />
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
          <div className="flex items-center gap-1 pt-3 border-t border-surface-divider">
          {/* Image upload trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={totalImages >= MAX_IMAGES || submitting}
            title={totalImages >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : 'Add photos'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-txt-secondary hover:text-accent-primary hover:bg-accent-primary/10
              transition-all text-xs font-body disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImagePlus size={16} />
            <span>Photo</span>
            {totalImages > 0 && (
              <span className="bg-accent-primary/20 text-accent-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {totalImages}
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

          <div className="flex-1" />

          {/* Cancel + Save buttons */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={submitting}
            className="mr-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || charCount === 0 || charCount > MAX_CONTENT}
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                Saving…
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
