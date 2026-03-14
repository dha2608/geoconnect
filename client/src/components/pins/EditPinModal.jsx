import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { updatePin, selectPinsLoading } from '../../features/pins/pinSlice';
import { closeModal } from '../../features/ui/uiSlice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { compressImages } from '../../utils/compressImage';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const PIN_CATEGORIES = [
  { value: 'food',          label: 'Food & Drink',   color: '#f59e0b', emoji: '🍜' },
  { value: 'entertainment', label: 'Entertainment',  color: '#8b5cf6', emoji: '🎭' },
  { value: 'shopping',      label: 'Shopping',       color: '#ec4899', emoji: '🛍️' },
  { value: 'outdoors',      label: 'Outdoors',       color: '#10b981', emoji: '🌿' },
  { value: 'culture',       label: 'Culture & Arts', color: '#06b6d4', emoji: '🎨' },
  { value: 'travel',        label: 'Travel',         color: '#3b82f6', emoji: '✈️' },
  { value: 'sports',        label: 'Sports',         color: '#ef4444', emoji: '⚽' },
  { value: 'health',        label: 'Health',         color: '#14b8a6', emoji: '💊' },
  { value: 'education',     label: 'Education',      color: '#f97316', emoji: '📚' },
  { value: 'other',         label: 'Other',          color: '#94a3b8', emoji: '📍' },
];

const MAX_IMAGES = 5;

/* ─── Validation Schema ─────────────────────────────────────────────────── */
const schema = z.object({
  title: z
    .string()
    .min(3,   'Title must be at least 3 characters.')
    .max(100, 'Title is too long (max 100 chars).'),
  description: z
    .string()
    .min(10,   'Description must be at least 10 characters.')
    .max(1000, 'Description is too long (max 1000 chars).'),
  category: z.string().min(1, 'Please select a category.'),
});

/* ─── Tiny helpers ──────────────────────────────────────────────────────── */
function FieldError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs text-accent-danger mt-1"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children, required }) {
  return (
    <label className="text-xs font-medium text-txt-secondary uppercase tracking-wide">
      {children}
      {required && <span className="text-accent-danger ml-0.5">*</span>}
    </label>
  );
}

function ImageThumb({ src, label, labelColor = 'bg-black/60', onRemove, ariaLabel }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      className="relative group aspect-square rounded-xl overflow-hidden border border-surface-divider bg-elevated"
    >
      <img
        src={src}
        alt={ariaLabel}
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = ''; }}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="p-2 rounded-full bg-accent-danger text-white shadow-lg"
          aria-label={ariaLabel}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      </div>
      <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold ${labelColor} text-white rounded px-1.5 py-0.5`}>
        {label}
      </span>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function EditPinModal() {
  const dispatch   = useDispatch();
  const modalOpen  = useSelector((state) => state.ui.modalOpen);
  const modalData  = useSelector((state) => state.ui.modalData);
  const pinLoading = useSelector(selectPinsLoading);

  const isOpen = modalOpen === 'editPin';
  const pin    = modalData;

  // Existing image URLs from the pin (user can remove, not replace)
  const [existingUrls, setExistingUrls] = useState([]);
  // Newly uploaded files
  const [newFiles,    setNewFiles]    = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [imageError,  setImageError]  = useState('');
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', category: '' },
  });

  /* Sync form & image state whenever modal opens with a (new) pin */
  useEffect(() => {
    if (isOpen && pin?._id) {
      reset({
        title:       pin.title       ?? '',
        description: pin.description ?? '',
        category:    pin.category    ?? '',
      });
      setExistingUrls(pin.images ?? []);
      setNewFiles([]);
      setNewPreviews([]);
      setImageError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pin?._id]);

  /* Revoke new blob URLs on unmount */
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalImages = existingUrls.length + newFiles.length;

  /* ── Handlers ── */
  const handleClose = () => {
    dispatch(closeModal());
    newPreviews.forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    setNewFiles([]);
    setNewPreviews([]);
    setExistingUrls([]);
    setImageError('');
    reset();
  };

  const removeExisting = (idx) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
    setImageError('');
  };

  const removeNew = (idx) => {
    const url = newPreviews[idx];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    setNewFiles((prev)    => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    setImageError('');
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;

    const remaining = MAX_IMAGES - totalImages;
    if (remaining <= 0) {
      setImageError(`Max ${MAX_IMAGES} images.`);
      return;
    }

    const accepted = incoming
      .slice(0, remaining)
      .filter((f) => f.type.startsWith('image/') && f.size < 10 * 1024 * 1024);

    if (accepted.length < incoming.length) {
      setImageError('Some files were skipped (unsupported type or >10 MB).');
    } else {
      setImageError('');
    }

    const previews = accepted.map((f) => URL.createObjectURL(f));
    setNewFiles((prev)    => [...prev, ...accepted]);
    setNewPreviews((prev) => [...prev, ...previews]);
    e.target.value = '';
  };

  const onSubmit = async (data) => {
    if (!pin?._id) return;

    const formData = new FormData();
    formData.append('title',       data.title);
    formData.append('description', data.description);
    formData.append('category',    data.category);

    // Tell the server which existing images to keep
    existingUrls.forEach((url) => formData.append('keepImages', url));
    // Compress and append new uploads
    const compressed = await compressImages(newFiles);
    compressed.forEach((file) => formData.append('images', file));

    try {
      await dispatch(updatePin({ id: pin._id, data: formData })).unwrap();
      toast.success('✏️ Pin updated!');
      handleClose();
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update pin. Please try again.');
    }
  };

  const busy = isSubmitting || pinLoading;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Pin" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* Title */}
        <div className="space-y-1.5">
          <SectionLabel required>Title</SectionLabel>
          <input
            {...register('title')}
            placeholder="What's this place called?"
            className={`
              w-full bg-elevated border rounded-xl px-4 py-3 text-sm text-txt-primary
              placeholder-txt-muted outline-none transition-all duration-150
              focus:border-accent-primary/50 focus:shadow-[0_0_18px_rgba(59,130,246,0.12)]
              ${errors.title ? 'border-accent-danger/50' : 'border-surface-divider'}
            `}
          />
          <FieldError message={errors.title?.message} />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <SectionLabel required>Description</SectionLabel>
          <textarea
            {...register('description')}
            placeholder="Tell people what makes this place special…"
            rows={3}
            className={`
              w-full bg-elevated border rounded-xl px-4 py-3 text-sm text-txt-primary
              placeholder-txt-muted outline-none transition-all duration-150 resize-none
              focus:border-accent-primary/50 focus:shadow-[0_0_18px_rgba(59,130,246,0.12)]
              ${errors.description ? 'border-accent-danger/50' : 'border-surface-divider'}
            `}
          />
          <FieldError message={errors.description?.message} />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <SectionLabel required>Category</SectionLabel>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {PIN_CATEGORIES.map((cat) => {
                  const selected = field.value === cat.value;
                  return (
                    <motion.button
                      key={cat.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => field.onChange(cat.value)}
                      className={`
                        flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left
                        text-sm transition-all duration-150
                        ${selected
                          ? 'text-txt-primary shadow-[0_0_0_1px_var(--cat-color)]'
                          : 'border-surface-divider bg-elevated text-txt-secondary hover:border-surface-divider hover:text-txt-primary'
                        }
                      `}
                      style={{
                        '--cat-color': cat.color,
                        ...(selected ? {
                          background: `${cat.color}18`,
                          borderColor: `${cat.color}55`,
                        } : {}),
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                        style={{
                          background:  cat.color,
                          boxShadow:   selected ? `0 0 6px ${cat.color}` : 'none',
                          transform:   selected ? 'scale(1.3)' : 'scale(1)',
                        }}
                      />
                      <span className="truncate font-body">{cat.emoji} {cat.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          />
          <FieldError message={errors.category?.message} />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Photos</SectionLabel>
            <span className="text-xs text-txt-muted">{totalImages}/{MAX_IMAGES}</span>
          </div>

          {/* Existing images */}
          {existingUrls.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-txt-muted uppercase tracking-wide">Current photos</p>
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-5 gap-2">
                  {existingUrls.map((url, i) => (
                    <ImageThumb
                      key={url}
                      src={url}
                      label={String(i + 1)}
                      ariaLabel={`Remove current photo ${i + 1}`}
                      onRemove={() => removeExisting(i)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}

          {/* New previews */}
          {newPreviews.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-txt-muted uppercase tracking-wide">New photos</p>
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-5 gap-2">
                  {newPreviews.map((url, i) => (
                    <ImageThumb
                      key={url}
                      src={url}
                      label="new"
                      labelColor="bg-accent-primary/80"
                      ariaLabel={`Remove new photo ${i + 1}`}
                      onRemove={() => removeNew(i)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}

          {/* Upload trigger */}
          {totalImages < MAX_IMAGES && (
            <motion.button
              type="button"
              whileHover={{ borderColor: 'rgba(59,130,246,0.4)', scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-xl border border-dashed border-[var(--glass-border)] bg-elevated/40 text-sm text-txt-muted hover:text-txt-secondary transition-all duration-150 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Add more photos
              <span className="text-xs text-txt-muted">(JPG, PNG, WEBP — max 10 MB)</span>
            </motion.button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <AnimatePresence>
            {imageError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-accent-warning"
              >
                {imageError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Location read-only note */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-elevated border border-surface-divider text-xs text-txt-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          Location is fixed and cannot be changed after creation.
        </div>

        {/* Footer actions */}
          <div className="flex gap-3 pt-2 border-t border-surface-divider">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="flex-1"
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={busy}
            disabled={busy}
          >
            {busy ? 'Saving…' : '✏️ Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
