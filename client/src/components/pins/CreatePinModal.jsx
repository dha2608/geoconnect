import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { createPin, selectPinsLoading } from '../../features/pins/pinSlice';
import { closeModal } from '../../features/ui/uiSlice';
import useRequireAuth from '../../hooks/useRequireAuth';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { compressImages } from '../../utils/compressImage';
import { geocodeApi } from '../../api/geocodeApi';

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

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Public',  icon: '🌍', desc: 'Everyone can see' },
  { value: 'friends', label: 'Friends', icon: '👥', desc: 'Only followers'   },
  { value: 'private', label: 'Private', icon: '🔒', desc: 'Only you'         },
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
  visibility: z.string().optional().default('public'),
  tags: z.string().optional(),
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
  const dispatch    = useDispatch();
  const { requireAuth, AuthGate } = useRequireAuth();
  const modalOpen   = useSelector((state) => state.ui.modalOpen);
  const modalData   = useSelector((state) => state.ui.modalData); // pre-filled coords from context menu
  const mapCenter   = useSelector((state) => state.map.center); // [lat, lng]
  const pinLoading  = useSelector(selectPinsLoading);

  const [imageFiles,    setImageFiles]    = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError,    setImageError]    = useState('');
  const fileInputRef = useRef(null);

  // ── New state ──────────────────────────────────────────────────────────
  const [address,        setAddress]        = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [tags,           setTags]           = useState([]);
  const [tagInputValue,  setTagInputValue]  = useState('');

  const isOpen = modalOpen === 'createPin';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title:       '',
      description: '',
      category:    '',
      visibility:  'public',
      lat: mapCenter?.[0] ?? 10.8231,
      lng: mapCenter?.[1] ?? 106.6297,
    },
  });

  const watchedLat = watch('lat');
  const watchedLng = watch('lng');

  // Sync coordinates each time modal opens
  // modalData coords (from context menu long-press) take priority over mapCenter
  useEffect(() => {
    if (!isOpen) return;
    if (modalData?.lat != null && modalData?.lng != null) {
      setValue('lat', parseFloat(Number(modalData.lat).toFixed(6)));
      setValue('lng', parseFloat(Number(modalData.lng).toFixed(6)));
    } else if (mapCenter) {
      setValue('lat', parseFloat(mapCenter[0].toFixed(6)));
      setValue('lng', parseFloat(mapCenter[1].toFixed(6)));
    }
  }, [isOpen, mapCenter, modalData, setValue]);

  // Reverse-geocode whenever modal is open + coordinates settle (debounced 800 ms)
  useEffect(() => {
    if (!isOpen) return;
    const lat = watchedLat;
    const lng = watchedLng;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    setAddressLoading(true);
    setAddress('');

    const timer = setTimeout(async () => {
      try {
        const res = await geocodeApi.reverse(lat, lng);
        setAddress(
          res.data?.display_name  ||
          res.data?.formatted     ||
          (typeof res.data?.address === 'string' ? res.data.address : '') ||
          ''
        );
      } catch {
        setAddress('');
      } finally {
        setAddressLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isOpen, watchedLat, watchedLng]);

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
    setAddress('');
    setAddressLoading(false);
    setTags([]);
    setTagInputValue('');
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

  /* ── Tag helpers ── */
  const commitTag = (raw) => {
    const tag = raw.trim().replace(/,/g, '');
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
  };

  const handleTagInputChange = (e) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const [head, ...rest] = val.split(',');
      commitTag(head);
      setTagInputValue(rest.join(',').trimStart());
    } else {
      setTagInputValue(val);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag(tagInputValue);
      setTagInputValue('');
    } else if (e.key === 'Backspace' && !tagInputValue && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (idx) => setTags((prev) => prev.filter((_, i) => i !== idx));

  /* ── Reverse-geocode helper for "Use map center" ── */
  const reverseGeocode = async (lat, lng) => {
    setAddressLoading(true);
    setAddress('');
    try {
      const res = await geocodeApi.reverse(lat, lng);
      setAddress(
        res.data?.display_name  ||
        res.data?.formatted     ||
        (typeof res.data?.address === 'string' ? res.data.address : '') ||
        ''
      );
    } catch {
      setAddress('');
    } finally {
      setAddressLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!requireAuth('create pins')) return;
    const formData = new FormData();
    formData.append('title',       data.title);
    formData.append('description', data.description);
    formData.append('category',    data.category);
    formData.append('visibility',  data.visibility || 'public');
    formData.append('tags',        tags.join(','));
    formData.append('address',     address);

    formData.append('lat', String(data.lat));
    formData.append('lng', String(data.lng));

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
      {AuthGate}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* ── Title ─────────────────────────────────────────────────────── */}
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

        {/* ── Description ───────────────────────────────────────────────── */}
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

        {/* ── Category ──────────────────────────────────────────────────── */}
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
                          background:  `${cat.color}18`,
                          borderColor: `${cat.color}55`,
                        } : {}),
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
                        style={{
                          background: cat.color,
                          boxShadow:  selected ? `0 0 6px ${cat.color}` : 'none',
                          transform:  selected ? 'scale(1.3)' : 'scale(1)',
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

        {/* ── Visibility ────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Visibility</SectionLabel>
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const selected = field.value === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => field.onChange(opt.value)}
                      className={`
                        flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border
                        text-center transition-all duration-150
                        ${selected
                          ? 'border-accent-primary/50 bg-accent-primary/10 text-txt-primary shadow-[0_0_14px_rgba(59,130,246,0.15)]'
                          : 'border-surface-divider bg-elevated text-txt-secondary hover:border-accent-primary/30 hover:text-txt-primary'
                        }
                      `}
                    >
                      <span className="text-xl leading-none">{opt.icon}</span>
                      <span className="text-xs font-medium">{opt.label}</span>
                      <span className="text-[10px] text-txt-muted leading-tight">{opt.desc}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {/* ── Tags ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Tags</SectionLabel>

          {/* Input */}
          <input
            type="text"
            value={tagInputValue}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            placeholder="Type a tag and press Enter or comma…"
            className="
              w-full bg-elevated border border-surface-divider rounded-xl px-4 py-3
              text-sm text-txt-primary placeholder-txt-muted outline-none
              transition-all duration-150
              focus:border-accent-primary/50 focus:shadow-[0_0_18px_rgba(59,130,246,0.12)]
            "
          />

          {/* Tag chips */}
          <AnimatePresence mode="popLayout">
            {tags.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-1.5 overflow-hidden"
              >
                {tags.map((tag, idx) => (
                  <motion.span
                    key={tag + idx}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="
                      inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                      bg-accent-primary/15 border border-accent-primary/30
                      text-xs text-accent-primary font-medium
                    "
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="ml-0.5 hover:text-accent-danger transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-txt-muted">
            Press <kbd className="px-1 py-0.5 rounded bg-surface-divider text-[10px]">Enter</kbd> or{' '}
            <kbd className="px-1 py-0.5 rounded bg-surface-divider text-[10px]">,</kbd> to add a tag
          </p>
        </div>

        {/* ── Location ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel required>Location</SectionLabel>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (mapCenter) {
                  const newLat = parseFloat(mapCenter[0].toFixed(6));
                  const newLng = parseFloat(mapCenter[1].toFixed(6));
                  setValue('lat', newLat);
                  setValue('lng', newLng);
                  reverseGeocode(newLat, newLng);
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

          {/* Lat / Lng inputs */}
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

          {/* Address (read-only, auto-filled) */}
          <div className="relative">
            {addressLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-surface-divider bg-elevated/60">
                {/* Spinner */}
                <svg
                  className="animate-spin text-accent-primary flex-shrink-0"
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-txt-muted">Fetching address…</span>
              </div>
            ) : address ? (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-surface-divider bg-elevated/60">
                <svg className="flex-shrink-0 mt-0.5 text-accent-primary" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-xs text-txt-secondary leading-relaxed">{address}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Photos ────────────────────────────────────────────────────── */}
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

        {/* ── Footer actions ────────────────────────────────────────────── */}
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
