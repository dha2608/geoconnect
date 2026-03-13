import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { createPin } from '../../features/pins/pinSlice';
import { closeModal } from '../../features/ui/uiSlice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { compressImages } from '../../utils/compressImage';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const PIN_CATEGORIES = [
  { value: 'food',          label: 'Food & Drink',      color: '#f59e0b', emoji: '🍜' },
  { value: 'entertainment', label: 'Entertainment',      color: '#8b5cf6', emoji: '🎭' },
  { value: 'shopping',      label: 'Shopping',           color: '#ec4899', emoji: '🛍️' },
  { value: 'outdoors',      label: 'Outdoors',           color: '#10b981', emoji: '🌿' },
  { value: 'culture',       label: 'Culture & Arts',     color: '#06b6d4', emoji: '🎨' },
  { value: 'travel',        label: 'Travel',             color: '#3b82f6', emoji: '✈️' },
  { value: 'sports',        label: 'Sports',             color: '#ef4444', emoji: '⚽' },
  { value: 'health',        label: 'Health',             color: '#14b8a6', emoji: '💊' },
  { value: 'education',     label: 'Education',          color: '#f97316', emoji: '📚' },
  { value: 'other',         label: 'Other',              color: '#94a3b8', emoji: '📍' },
];

const MAX_IMAGES = 5;

/* ─── Validation Schema ─────────────────────────────────────────────────── */
const schema = z.object({
  title: z
    .string()
    .min(3,  'Title must be at least 3 characters.')
    .max(100, 'Title is too long (max 100 chars).'),
  description: z
    .string()
    .min(10,  'Description must be at least 10 characters.')
    .max(1000, 'Description is too long (max 1000 chars).'),
  category: z.string().min(1, 'Please select a category.'),
  lat: z
    .number({ invalid_type_error: 'Latitude must be a number.' })
    .min(-90, 'Latitude must be between -90 and 90.')
    .max(90,  'Latitude must be between -90 and 90.'),
  lng: z
    .number({ invalid_type_error: 'Longitude must be a number.' })
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180,  'Longitude must be between -180 and 180.'),
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

function ImagePreview({ url, index, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      className="relative group aspect-square rounded-xl overflow-hidden border border-surface-divider bg-elevated"
    >
      <img
        src={url}
        alt={`Preview ${index + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = ''; }}
      />
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(index)}
          className="p-2 rounded-full bg-accent-danger text-white shadow-lg"
          aria-label={`Remove image ${index + 1}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      </div>
      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-black/60 text-white rounded px-1.5 py-0.5">
        {index + 1}
      </span>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CreatePinModal() {
  const dispatch   = useDispatch();
  const modalOpen  = useSelector((state) => state.ui.modalOpen);
  const mapCenter  = useSelector((state) => state.map.center); // [lat, lng]
  const pinLoading = useSelector((state) => state.pins.loading);

  const [imageFiles,    setImageFiles]    = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError,    setImageError]    = useState('');
  const fileInputRef = useRef(null);

  const isOpen = modalOpen === 'createPin';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title:       '',
      description: '',
      category:    '',
      lat: mapCenter?.[0] ?? 10.8231,
      lng: mapCenter?.[1] ?? 106.6297,
    },
  });

  // Sync coordinates each time modal opens
  useEffect(() => {
    if (isOpen && mapCenter) {
      setValue('lat', parseFloat(mapCenter[0].toFixed(6)));
      setValue('lng', parseFloat(mapCenter[1].toFixed(6)));
    }
  }, [isOpen, mapCenter, setValue]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ── */
  const handleClose = () => {
    dispatch(closeModal());
    reset();
    imagePreviews.forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
    setImageFiles([]);
    setImagePreviews([]);
    setImageError('');
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    if (remaining <= 0) {
      setImageError(`You can only add up to ${MAX_IMAGES} images.`);
      return;
    }

    const accepted = incoming
      .slice(0, remaining)
      .filter((f) => f.type.startsWith('image/') && f.size < 10 * 1024 * 1024); // 10 MB cap

    if (accepted.length < incoming.length) {
      setImageError('Some files were skipped (unsupported type or >10 MB).');
    } else {
      setImageError('');
    }

    const previews = accepted.map((f) => URL.createObjectURL(f));
    setImageFiles((prev)    => [...prev, ...accepted]);
    setImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = ''; // allow re-selecting same file
  };

  const removeImage = (idx) => {
    const url = imagePreviews[idx];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    setImageFiles((prev)    => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setImageError('');
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('title',       data.title);
    formData.append('description', data.description);
    formData.append('category',    data.category);

    // GeoJSON coordinates = [longitude, latitude]
    formData.append('location[type]',            'Point');
    formData.append('location[coordinates][0]',  String(data.lng));
    formData.append('location[coordinates][1]',  String(data.lat));

    // Compress images before upload
    const compressed = await compressImages(imageFiles);
    compressed.forEach((file) => formData.append('images', file));

    try {
      await dispatch(createPin(formData)).unwrap();
      toast.success('📍 Pin created!');
      handleClose();
    } catch (err) {
      const msg = err?.message ?? 'Failed to create pin. Please try again.';
      toast.error(msg);
    }
  };

  const busy = isSubmitting || pinLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Drop a New Pin"
      size="lg"
    >
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
                          background: cat.color,
                          boxShadow: selected ? `0 0 6px ${cat.color}` : 'none',
                          transform: selected ? 'scale(1.3)' : 'scale(1)',
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

        {/* Location */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel required>Location</SectionLabel>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (mapCenter) {
                  setValue('lat', parseFloat(mapCenter[0].toFixed(6)));
                  setValue('lng', parseFloat(mapCenter[1].toFixed(6)));
                }
              }}
              className="text-xs text-accent-primary hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Use map center
            </motion.button>
          </div>
          <div className="flex gap-3">
            {[
              { key: 'lat', label: 'LAT', placeholder: '10.8231' },
              { key: 'lng', label: 'LNG', placeholder: '106.6297' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex-1 space-y-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-txt-muted font-mono select-none">
                    {label}
                  </span>
                  <input
                    {...register(key, { valueAsNumber: true })}
                    type="number"
                    step="any"
                    placeholder={placeholder}
                    className={`
                      w-full bg-elevated border rounded-xl pl-11 pr-3 py-3 text-sm
                      text-txt-primary placeholder-txt-muted outline-none font-mono
                      transition-all duration-150
                      focus:border-accent-primary/50 focus:shadow-[0_0_18px_rgba(59,130,246,0.12)]
                      ${errors[key] ? 'border-accent-danger/50' : 'border-surface-divider'}
                    `}
                  />
                </div>
                <FieldError message={errors[key]?.message} />
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Photos</SectionLabel>
            <span className="text-xs text-txt-muted">
              {imageFiles.length}/{MAX_IMAGES}
            </span>
          </div>

          {/* Previews grid */}
          <AnimatePresence mode="popLayout">
            {imagePreviews.length > 0 && (
              <motion.div layout className="grid grid-cols-5 gap-2">
                <AnimatePresence mode="popLayout">
                  {imagePreviews.map((url, i) => (
                    <ImagePreview key={url} url={url} index={i} onRemove={removeImage} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload button */}
          {imageFiles.length < MAX_IMAGES && (
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
              Click to add photos
              <span className="text-xs text-txt-muted">(JPG, PNG, WEBP — max 10 MB each)</span>
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
            {busy ? 'Dropping pin…' : '📍 Drop Pin'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
