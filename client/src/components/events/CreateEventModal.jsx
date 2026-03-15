/**
 * CreateEventModal.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Modal for creating a new event.
 * Renders only when state.ui.modalOpen === 'createEvent'.
 *
 * Features
 *  • react-hook-form + zod validation
 *  • Animated category selection grid (6 cards)
 *  • Drag-and-drop / click-to-upload cover image with live preview
 *  • Date/time pickers styled to the dark-glass theme
 *  • Visibility toggle (Public / Private) with animated pill
 *  • Location auto-filled from state.map.center ([lat, lng])
 *  • Submits as FormData for image upload support
 *  • AnimatePresence field-error messages
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import compressImage from '../../utils/compressImage';

import Modal  from '../ui/Modal';
import Button from '../ui/Button';

import { createEvent, updateEvent, selectEventsLoading }  from '../../features/events/eventSlice';
import { closeModal }   from '../../features/ui/uiSlice';
import useRequireAuth from '../../hooks/useRequireAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { value: 'meetup', label: 'Meetup', color: '#3b82f6', emoji: '🤝' },
  { value: 'party',  label: 'Party',  color: '#8b5cf6', emoji: '🎉' },
  { value: 'sports', label: 'Sports', color: '#10b981', emoji: '⚽' },
  { value: 'music',  label: 'Music',  color: '#ec4899', emoji: '🎵' },
  { value: 'food',   label: 'Food',   color: '#f59e0b', emoji: '🍕' },
  { value: 'other',  label: 'Other',  color: '#06b6d4', emoji: '📅' },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Zod schema ───────────────────────────────────────────────────────────────

const baseSchema = z.object({
    title: z
      .string()
      .min(3,   'Title must be at least 3 characters')
      .max(100, 'Title cannot exceed 100 characters'),

    description: z
      .string()
      .min(10,   'Description must be at least 10 characters')
      .max(1000, 'Description cannot exceed 1000 characters'),

    category: z.enum(
      ['meetup', 'party', 'sports', 'music', 'food', 'other'],
      { required_error: 'Please select a category' },
    ),

    startTime: z.string().min(1, 'Start time is required'),

    endTime: z.string().min(1, 'End time is required'),

    maxCapacity: z.coerce.number().min(0, 'Capacity cannot be negative').default(0),

    isPublic: z.boolean().default(true),

    address: z.string().optional(),
  });

const endTimeRefine = (data, ctx) => {
  if (data.startTime && data.endTime) {
    if (new Date(data.endTime) <= new Date(data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime'],
      });
    }
  }
};

const eventSchema = baseSchema.superRefine(endTimeRefine);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated validation error message */
function FieldError({ message }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.p
          key={message}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0,  height: 'auto' }}
          exit={{    opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-1.5 text-xs text-red-400 flex items-center gap-1 overflow-hidden"
        >
          <span aria-hidden="true">⚠</span> {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// ─── Shared style fragments ───────────────────────────────────────────────────

const INPUT_CLS = [
  'w-full px-3 py-2.5 rounded-lg text-sm',
  'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
  'text-slate-100 placeholder:text-slate-600',
  'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25',
  'transition-colors duration-200',
  '[color-scheme:dark]',           // makes date-picker chrome dark in Chromium
].join(' ');

const LABEL_CLS = 'block text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-1.5';

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateEventModal() {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();

  const modalOpen  = useSelector((s) => s.ui.modalOpen);
  const modalData  = useSelector((s) => s.ui.modalData);
  const mapCenter  = useSelector((s) => s.map.center);     // [lat, lng]
  const loading = useSelector(selectEventsLoading);

  const editEvent = modalData?.editEvent ?? null;
  const isEditMode = Boolean(editEvent);

  // Image state
  const [coverFile,    setCoverFile]    = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);

  // Tags state
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Recurrence state
  const [recurrence, setRecurrence] = useState({ type: 'none', interval: 1, daysOfWeek: [], endDate: '' });

  // Reminders state
  const [reminders, setReminders] = useState([{ minutesBefore: 60 }]);

  const REMINDER_PRESETS = [
    { label: '5 min',  value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '1 day',  value: 1440 },
  ];

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isOpen = modalOpen === 'createEvent';

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title:       '',
      description: '',
      category:    '',
      startTime:   '',
      endTime:     '',
      maxCapacity: 0,
      isPublic:    true,
      address:     '',
    },
  });

  const selectedCategory = watch('category');

  // ── Pre-populate form for edit mode ───────────────────────────────────────
  useEffect(() => {
    if (isOpen && isEditMode && editEvent) {
      const toLocalDatetime = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        // format as YYYY-MM-DDTHH:mm for datetime-local input
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      reset({
        title:       editEvent.title ?? '',
        description: editEvent.description ?? '',
        category:    editEvent.category ?? '',
        startTime:   toLocalDatetime(editEvent.startTime),
        endTime:     toLocalDatetime(editEvent.endTime),
        maxCapacity: editEvent.maxCapacity ?? 0,
        isPublic:    editEvent.isPublic ?? true,
        address:     editEvent.address ?? '',
      });
      // Show existing cover image preview
      if (editEvent.coverImage) {
        setCoverPreview(editEvent.coverImage);
      }
      // Pre-populate tags, recurrence, reminders
      if (editEvent.tags?.length) setTags(editEvent.tags);
      if (editEvent.recurrence) {
        setRecurrence({
          type: editEvent.recurrence.type ?? 'none',
          interval: editEvent.recurrence.interval ?? 1,
          daysOfWeek: editEvent.recurrence.daysOfWeek ?? [],
          endDate: editEvent.recurrence.endDate
            ? new Date(editEvent.recurrence.endDate).toISOString().split('T')[0]
            : '',
        });
      }
      if (editEvent.reminders?.length) {
        setReminders(editEvent.reminders.map((r) => ({ minutesBefore: r.minutesBefore })));
      }
    }
  }, [isOpen, isEditMode, editEvent, reset]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    reset();
    setCoverFile(null);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTags([]);
    setTagInput('');
    setRecurrence({ type: 'none', interval: 1, daysOfWeek: [], endDate: '' });
    setReminders([{ minutesBefore: 60 }]);
    dispatch(closeModal());
  }, [dispatch, reset]);

  const acceptImageFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP…)');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCoverFile(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptImageFile(e.dataTransfer.files?.[0]);
  }, [acceptImageFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ── Tag handlers ──────────────────────────────────────────────────────────
  const handleAddTag = useCallback((value) => {
    const tag = value.trim().toLowerCase().replace(/^#/, '');
    if (tag && tag.length <= 30 && tags.length < 10 && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  }, [tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }, [tagInput, tags, handleAddTag]);

  // ── Reminder handlers ─────────────────────────────────────────────────────
  const handleAddReminder = useCallback((minutes) => {
    if (reminders.length >= 5) return;
    if (reminders.some((r) => r.minutesBefore === minutes)) return;
    setReminders((prev) => [...prev, { minutesBefore: minutes }].sort((a, b) => a.minutesBefore - b.minutesBefore));
  }, [reminders]);

  const handleRemoveReminder = useCallback((minutes) => {
    setReminders((prev) => prev.filter((r) => r.minutesBefore !== minutes));
  }, []);

  // Revoke object URL when component unmounts
  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values) => {
    if (!requireAuth(isEditMode ? 'edit events' : 'create events')) return;

    // For new events, start time must be in the future
    if (!isEditMode && values.startTime && new Date(values.startTime) <= new Date()) {
      toast.error('Start time must be in the future');
      return;
    }

    const fd = new FormData();

    fd.append('title',       values.title);
    fd.append('description', values.description);
    fd.append('category',    values.category);
    fd.append('startTime',   values.startTime);
    fd.append('endTime',     values.endTime);
    fd.append('maxCapacity', String(values.maxCapacity ?? 0));
    fd.append('isPublic',    String(values.isPublic));

    if (values.address) fd.append('address', values.address);
    if (coverFile) {
      const compressed = await compressImage(coverFile);
      fd.append('coverImage', compressed);
    }

    // Tags
    if (tags.length) {
      tags.forEach((tag) => fd.append('tags[]', tag));
    }

    // Recurrence
    if (recurrence.type !== 'none') {
      fd.append('recurrence[type]', recurrence.type);
      fd.append('recurrence[interval]', String(recurrence.interval));
      if (recurrence.type === 'weekly' && recurrence.daysOfWeek.length) {
        recurrence.daysOfWeek.forEach((d) => fd.append('recurrence[daysOfWeek][]', String(d)));
      }
      if (recurrence.endDate) {
        fd.append('recurrence[endDate]', recurrence.endDate);
      }
    }

    // Reminders
    if (reminders.length) {
      reminders.forEach((r) => fd.append('reminders[]', JSON.stringify(r)));
    }

    // GeoJSON Point from map centre — center is [lat, lng]
    if (mapCenter) {
      const [lat, lng] = mapCenter;
      fd.append('location', JSON.stringify({ type: 'Point', coordinates: [lng, lat] }));
    }

    try {
      if (isEditMode) {
        await dispatch(updateEvent({ id: editEvent._id, data: fd })).unwrap();
        toast.success('Event updated!');
      } else {
        await dispatch(createEvent(fd)).unwrap();
        toast.success('Event created! 🎉');
      }
      handleClose();
    } catch (err) {
      toast.error(err?.message ?? `Failed to ${isEditMode ? 'update' : 'create'} event. Please try again.`);
    }
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Edit Event' : 'Create Event'}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 max-h-[74vh] overflow-y-auto pr-0.5"
        noValidate
      >

        {/* ── Cover image upload ─────────────────────────────────────────── */}
        <div>
          <label className={LABEL_CLS}>Cover Image</label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
              coverPreview ? 'h-40' : 'h-28',
              isDragging
                ? 'border-blue-500/70 bg-blue-500/10 scale-[1.01]'
                : 'border-[var(--glass-border)] hover:border-[var(--glass-border)] bg-[var(--glass-bg)]',
            ].join(' ')}
          >
            {/* Hidden file input overlays the whole drop zone */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => acceptImageFile(e.target.files?.[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Upload cover image"
            />

            {coverPreview ? (
              <div className="relative w-full h-full">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center
                                opacity-0 hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none">
                  <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-lg">
                    📷 Change Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-600 pointer-events-none">
                <span className="text-3xl">📷</span>
                <p className="text-xs font-medium">
                  {isDragging ? 'Drop it here!' : 'Drop an image or click to upload'}
                </p>
                <p className="text-[10px] text-slate-700">PNG · JPG · WebP · max 5 MB</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="evt-title" className={LABEL_CLS}>Event Title *</label>
          <input
            id="evt-title"
            {...register('title')}
            placeholder="What's happening?"
            className={INPUT_CLS}
          />
          <FieldError message={errors.title?.message} />
        </div>

        {/* ── Category grid ─────────────────────────────────────────────── */}
        <div>
          <label className={LABEL_CLS}>Category *</label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Event category">
                {EVENT_CATEGORIES.map((cat) => {
                  const active = field.value === cat.value;
                  return (
                    <motion.button
                      key={cat.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => field.onChange(cat.value)}
                      className={[
                        'relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl',
                        'border-2 cursor-pointer transition-all duration-200 focus:outline-none',
                        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
                        active
                          ? 'shadow-lg'
                          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active hover:border-[var(--glass-border)]',
                      ].join(' ')}
                      style={
                        active
                          ? {
                              borderColor:     cat.color,
                              backgroundColor: `${cat.color}18`,
                              boxShadow:       `0 0 0 1px ${cat.color}40, 0 4px 12px ${cat.color}25`,
                            }
                          : {}
                      }
                    >
                      <span className="text-xl leading-none">{cat.emoji}</span>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: active ? cat.color : '#94a3b8' }}
                      >
                        {cat.label}
                      </span>

                      {/* Selected indicator dot */}
                      <AnimatePresence>
                        {active && (
                          <motion.span
                            layoutId="cat-dot"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            )}
          />
          <FieldError message={errors.category?.message} />
        </div>

        {/* ── Description ───────────────────────────────────────────────── */}
        <div>
          <label htmlFor="evt-desc" className={LABEL_CLS}>Description *</label>
          <textarea
            id="evt-desc"
            {...register('description')}
            placeholder="Tell people what to expect…"
            rows={3}
            className={`${INPUT_CLS} resize-none`}
          />
          <FieldError message={errors.description?.message} />
        </div>

        {/* ── Tags ───────────────────────────────────────────────────────── */}
        <div>
          <label className={LABEL_CLS}>Tags <span className="normal-case text-slate-600">(max 10)</span></label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <motion.span
                key={tag}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                           bg-blue-500/15 text-blue-300 text-xs font-medium"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 hover:text-red-400 transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </motion.span>
            ))}
          </div>
          {tags.length < 10 && (
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => tagInput.trim() && handleAddTag(tagInput)}
              placeholder="Type a tag and press Enter…"
              className={INPUT_CLS}
              maxLength={30}
            />
          )}
        </div>

        {/* ── Start / End date-time ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="evt-start" className={LABEL_CLS}>Start Time *</label>
            <input
              id="evt-start"
              type="datetime-local"
              {...register('startTime')}
              className={INPUT_CLS}
            />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div>
            <label htmlFor="evt-end" className={LABEL_CLS}>End Time *</label>
            <input
              id="evt-end"
              type="datetime-local"
              {...register('endTime')}
              className={INPUT_CLS}
            />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        {/* ── Recurrence ────────────────────────────────────────────────── */}
        <div>
          <label className={LABEL_CLS}>Recurrence</label>
          <div className="space-y-3">
            {/* Type selector */}
            <div className="flex gap-1.5 rounded-lg overflow-hidden
                            border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              {['none', 'daily', 'weekly', 'monthly'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRecurrence((prev) => ({ ...prev, type }))}
                  className={[
                    'flex-1 py-2 text-xs font-medium transition-all duration-200 capitalize',
                    recurrence.type === type
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {type === 'none' ? 'One-time' : type}
                </button>
              ))}
            </div>

            {recurrence.type !== 'none' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Interval */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={recurrence.interval}
                    onChange={(e) => setRecurrence((prev) => ({ ...prev, interval: Math.max(1, Math.min(52, Number(e.target.value) || 1)) }))}
                    className={`${INPUT_CLS} w-20 text-center`}
                  />
                  <span className="text-xs text-slate-500">
                    {recurrence.type === 'daily' ? 'day(s)' : recurrence.type === 'weekly' ? 'week(s)' : 'month(s)'}
                  </span>
                </div>

                {/* Days of week (only for weekly) */}
                {recurrence.type === 'weekly' && (
                  <div>
                    <span className="text-xs text-slate-500 mb-1.5 block">On days:</span>
                    <div className="flex gap-1.5">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setRecurrence((prev) => ({
                              ...prev,
                              daysOfWeek: prev.daysOfWeek.includes(idx)
                                ? prev.daysOfWeek.filter((d) => d !== idx)
                                : [...prev.daysOfWeek, idx].sort(),
                            }));
                          }}
                          className={[
                            'w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200',
                            recurrence.daysOfWeek.includes(idx)
                              ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                              : 'bg-[var(--glass-bg)] text-slate-500 border border-[var(--glass-border)] hover:text-slate-300',
                          ].join(' ')}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End date */}
                <div>
                  <label htmlFor="evt-rec-end" className="text-xs text-slate-500 mb-1 block">
                    Repeat until <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    id="evt-rec-end"
                    type="date"
                    value={recurrence.endDate}
                    onChange={(e) => setRecurrence((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Address ───────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="evt-addr" className={LABEL_CLS}>Address</label>
          <input
            id="evt-addr"
            {...register('address')}
            placeholder="123 Main St, City"
            className={INPUT_CLS}
          />
          <FieldError message={errors.address?.message} />
        </div>

        {/* ── Capacity + Visibility ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 items-start">
          <div>
            <label htmlFor="evt-cap" className={LABEL_CLS}>
              Capacity&nbsp;<span className="normal-case text-slate-600">(0 = unlimited)</span>
            </label>
            <input
              id="evt-cap"
              type="number"
              min="0"
              placeholder="0"
              {...register('maxCapacity')}
              className={INPUT_CLS}
            />
            <FieldError message={errors.maxCapacity?.message} />
          </div>

          <div>
            <label className={LABEL_CLS}>Visibility</label>
            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <div
                  className="flex h-[42px] rounded-lg overflow-hidden
                             border border-[var(--glass-border)] bg-[var(--glass-bg)]"
                >
                  {[
                    { value: true,  icon: '🌍', label: 'Public' },
                    { value: false, icon: '🔒', label: 'Private' },
                  ].map(({ value, icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={[
                        'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200',
                        field.value === value
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'text-slate-500 hover:text-slate-300',
                      ].join(' ')}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        </div>

        {/* ── Reminders ───────────────────────────────────────────────── */}
        <div>
          <label className={LABEL_CLS}>Reminders <span className="normal-case text-slate-600">(max 5)</span></label>

          {/* Active reminders */}
          {reminders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {reminders.map((r) => {
                const preset = REMINDER_PRESETS.find((p) => p.minutes === r.minutesBefore);
                return (
                  <motion.span
                    key={r.minutesBefore}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                               bg-amber-500/15 text-amber-300 text-xs font-medium"
                  >
                    🔔 {preset?.label ?? `${r.minutesBefore}m before`}
                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(r.minutesBefore)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                      aria-label="Remove reminder"
                    >
                      ×
                    </button>
                  </motion.span>
                );
              })}
            </div>
          )}

          {/* Preset buttons */}
          {reminders.length < 5 && (
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_PRESETS.filter((p) => !reminders.some((r) => r.minutesBefore === p.minutes)).map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleAddReminder(preset.minutes)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                             bg-[var(--glass-bg)] border border-[var(--glass-border)]
                             text-slate-500 hover:text-slate-300 hover:border-amber-500/30
                             transition-all duration-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Location preview (read-only info) ────────────────────────── */}
        {mapCenter && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                          bg-surface-hover border border-[var(--glass-border)]">
            <span className="text-blue-400 text-sm">📍</span>
            <p className="text-[11px] text-slate-500">
              Location from map centre:&nbsp;
              <span className="font-mono text-slate-400">
                {mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}
              </span>
            </p>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1 pb-1 sticky bottom-0
                        bg-gradient-to-t from-[var(--glass-bg)] via-[var(--glass-bg)]/90 to-transparent -mx-0.5 px-0.5">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || loading}
            className="flex-1"
          >
            {isSubmitting || loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                />
                {isEditMode ? 'Saving…' : 'Creating…'}
              </span>
            ) : (
              isEditMode ? '💾 Save Changes' : '✨ Create Event'
            )}
          </Button>
        </div>

      </form>
    </Modal>
  );
}
