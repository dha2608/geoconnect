import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { togglePinLike, togglePinSave, clearSelectedPin, fetchPin } from '../../features/pins/pinSlice';
import { closeModal, openModal } from '../../features/ui/uiSlice';
import useRequireAuth from '../../hooks/useRequireAuth';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ImageLightbox from '../ui/ImageLightbox';
import StarRating from '../reviews/StarRating';
import ReviewForm from '../reviews/ReviewForm';
import ReviewList from '../reviews/ReviewList';

/* ─── Category Config ────────────────────────────────────────────────────── */
const CATEGORY_MAP = {
  food:          { label: 'Food & Drink',   color: 'warning',   emoji: '🍜' },
  entertainment: { label: 'Entertainment',  color: 'secondary', emoji: '🎭' },
  shopping:      { label: 'Shopping',       color: 'danger',    emoji: '🛍️' },
  outdoors:      { label: 'Outdoors',       color: 'success',   emoji: '🌿' },
  culture:       { label: 'Culture & Arts', color: 'secondary', emoji: '🎨' },
  travel:        { label: 'Travel',         color: 'primary',   emoji: '✈️' },
  sports:        { label: 'Sports',         color: 'danger',    emoji: '⚽' },
  health:        { label: 'Health',         color: 'success',   emoji: '💊' },
  education:     { label: 'Education',      color: 'warning',   emoji: '📚' },
  other:         { label: 'Other',          color: 'primary',   emoji: '📍' },
};

/* ─── Image Carousel ────────────────────────────────────────────────────── */
function ImageCarousel({ images = [], title = '' }) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  // Reset index when images change
  useEffect(() => { setCurrent(0); }, [images]);

  if (!images.length) {
    return (
      <div className="w-full h-52 rounded-xl bg-elevated flex items-center justify-center border border-surface-divider">
        <span className="text-txt-muted text-sm flex flex-col items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          No photos
        </span>
      </div>
    );
  }

  return (
    <>
    <div className="relative rounded-xl overflow-hidden select-none cursor-pointer" style={{ height: '220px' }} onClick={() => setLightboxOpen(true)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={current}
          src={images[current]}
          alt={`${title} — photo ${current + 1}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Photo count badge */}
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Prev / Next arrows (only when multiple) */}
      {images.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1, x: -1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Previous photo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, x: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Next photo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <motion.button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                animate={{ scale: i === current ? 1.2 : 1, opacity: i === current ? 1 : 0.5 }}
                className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/70'}`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>

      <ImageLightbox
        images={images}
        initialIndex={current}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

/* ─── Action Button ─────────────────────────────────────────────────────── */
function ActionButton({ onClick, active, activeColor, label, children, loading }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={loading}
      title={label}
      className={`
        flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${active
          ? `border-[${activeColor}]/30 bg-[${activeColor}]/10 text-[${activeColor}]`
          : 'border-surface-divider bg-elevated text-txt-secondary hover:text-txt-primary hover:border-surface-divider'
        }
      `}
    >
      {children}
      <span className="text-xs font-medium font-body">{label}</span>
    </motion.button>
  );
}

/* ─── Loading Skeleton ──────────────────────────────────────────────────── */
function PinDetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="w-full h-52 rounded-xl bg-surface-hover" />
      <div className="space-y-3">
        <div className="h-6 bg-surface-hover rounded-lg w-3/4" />
        <div className="h-3.5 bg-surface-hover rounded-lg w-1/4" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="flex-1 h-14 bg-surface-hover rounded-xl" />)}
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-surface-hover rounded w-full" />
        <div className="h-3 bg-surface-hover rounded w-4/5" />
        <div className="h-3 bg-surface-hover rounded w-3/5" />
      </div>
    </div>
  );
}

/* ─── Share helper ──────────────────────────────────────────────────────── */
async function sharePin(pin) {
  const url  = `${window.location.origin}/?pin=${pin._id}`;
  const text = `Check out "${pin.title}" on GeoConnect`;

  if (navigator.share) {
    try {
      await navigator.share({ title: pin.title, text, url });
      return;
    } catch { /* fall through */ }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Unable to copy link.');
  }
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function PinDetailPanel() {
  const dispatch    = useDispatch();
  const requireAuth = useRequireAuth();
  const modalOpen   = useSelector((state) => state.ui.modalOpen);
  const modalData   = useSelector((state) => state.ui.modalData);
  const selectedPin = useSelector((state) => state.pins.selectedPin);
  const user        = useSelector((state) => state.auth.user);

  const isOpen = modalOpen === 'pinDetail';

  // Pin source: prefer Redux selectedPin, fallback to modalData
  const pin = selectedPin ?? (modalData && typeof modalData === 'object' && modalData._id ? modalData : null);

  // Optimistic save state (no extraReducer for togglePinSave in pinSlice)
  const [localSaved,    setLocalSaved]    = useState(null);
  const [likeLoading,   setLikeLoading]   = useState(false);
  const [saveLoading,   setSaveLoading]   = useState(false);
  const [latestReview,  setLatestReview]  = useState(null);
  const [fetchError,    setFetchError]    = useState(null);

  // Derived interaction state
  const isLiked = pin?.likes?.includes(user?._id) ?? false;
  const isSaved = localSaved !== null ? localSaved : (pin?.saves?.includes(user?._id) ?? false);

  const category = pin?.category ? CATEGORY_MAP[pin.category] ?? CATEGORY_MAP.other : null;

  // Fetch pin by ID if only the ID is in modalData
  useEffect(() => {
    if (!isOpen) return;
    const id = modalData?.pinId ?? modalData?.id ?? modalData?._id;
    if (id && !selectedPin) {
      setFetchError(null);
      dispatch(fetchPin(id)).unwrap().catch(() => {
        setFetchError('Failed to load pin details.');
      });
    }
  }, [isOpen, modalData, selectedPin, dispatch]);

  // Reset local save when a new pin is shown
  useEffect(() => {
    setLocalSaved(null);
    setLatestReview(null);
    setFetchError(null);
  }, [pin?._id]);

  const handleClose = useCallback(() => {
    dispatch(closeModal());
    dispatch(clearSelectedPin());
  }, [dispatch]);

  const handleEdit = useCallback(() => {
    if (!pin) return;
    dispatch(openModal({ type: 'editPin', data: pin }));
  }, [dispatch, pin]);

  const handleLike = async () => {
    if (!requireAuth('like pins')) return;
    if (!pin) return;
    setLikeLoading(true);
    const wasLiked = isLiked;
    try {
      await dispatch(togglePinLike(pin._id)).unwrap();
      toast.success(wasLiked ? 'Like removed' : 'Liked! ❤️');
    } catch {
      toast.error('Failed to update like.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!requireAuth('save pins')) return;
    if (!pin) return;
    const next = !isSaved;
    setLocalSaved(next);
    setSaveLoading(true);
    try {
      await dispatch(togglePinSave(pin._id)).unwrap();
      toast.success(next ? 'Pin saved! 🔖' : 'Pin unsaved');
    } catch {
      setLocalSaved(!next); // revert optimistic update
      toast.error('Failed to save pin.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleNewReview = (review) => {
    setLatestReview(review);
  };

  /* ── Render ── */
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      className="!p-0"   // override default p-6 — we handle padding manually per section
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Modal custom header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-surface-divider">
          <h2 className="text-lg font-heading font-bold text-txt-primary">
            {pin?.title ?? 'Pin Details'}
          </h2>
          <div className="flex items-center gap-1.5">
            {/* Edit button — only for the pin's creator */}
            {user && pin?.createdBy?._id === user._id && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body text-txt-secondary hover:text-accent-primary hover:bg-accent-primary/10 border border-surface-divider transition-all duration-150"
                aria-label="Edit pin"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
                Edit
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5 space-y-5">

          {/* Error state */}
          {fetchError && !pin && (
            <div className="py-10 text-center space-y-3">
              <p className="text-accent-danger text-sm">{fetchError}</p>
              <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
            </div>
          )}

          {/* Loading state */}
          {!pin && !fetchError && <PinDetailSkeleton />}

          {/* Pin content */}
          {pin && (
            <AnimatePresence mode="wait">
              <motion.div
                key={pin._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Image Carousel */}
                <ImageCarousel images={pin.images ?? []} title={pin.title} />

                {/* Title + meta */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-heading font-bold text-txt-primary leading-snug">
                      {pin.title}
                    </h3>
                    {category && (
                      <Badge color={category.color} dot className="flex-shrink-0 mt-0.5">
                        {category.emoji} {category.label}
                      </Badge>
                    )}
                  </div>

                  {/* Rating row */}
                  {(pin.averageRating != null || pin.reviewCount != null) && (
                    <div className="flex items-center gap-2.5">
                      <StarRating value={pin.averageRating ?? 0} readonly size="sm" />
                      <span className="text-sm font-semibold text-accent-warning">
                        {pin.averageRating ? pin.averageRating.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-txt-muted">
                        ({pin.reviewCount ?? 0} review{pin.reviewCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}

                  {/* Location coordinates */}
                  {pin.location?.coordinates && (
                    <div className="flex items-center gap-1.5 text-xs text-txt-muted">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      <span className="font-mono">
                        {pin.location.coordinates[1].toFixed(5)},&nbsp;
                        {pin.location.coordinates[0].toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons: Like / Save / Share */}
                <div className="flex gap-2">
                  {/* Like */}
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={handleLike}
                    disabled={likeLoading}
                    className={`
                      flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border
                      transition-all duration-150 disabled:opacity-60
                       ${isLiked
                        ? 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger'
                        : 'border-surface-divider bg-elevated text-txt-secondary hover:text-txt-primary hover:border-surface-divider'
                      }
                    `}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                  >
                    <motion.svg
                      width="20" height="20"
                      viewBox="0 0 24 24"
                      fill={isLiked ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </motion.svg>
                    <span className="text-xs font-medium">
                      {pin.likes?.length ?? 0} Like{pin.likes?.length !== 1 ? 's' : ''}
                    </span>
                  </motion.button>

                  {/* Save */}
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={handleSave}
                    disabled={saveLoading}
                    className={`
                      flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border
                      transition-all duration-150 disabled:opacity-60
                       ${isSaved
                        ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                        : 'border-surface-divider bg-elevated text-txt-secondary hover:text-txt-primary hover:border-surface-divider'
                      }
                    `}
                    aria-label={isSaved ? 'Unsave' : 'Save'}
                  >
                    <motion.svg
                      width="20" height="20"
                      viewBox="0 0 24 24"
                      fill={isSaved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={isSaved ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </motion.svg>
                    <span className="text-xs font-medium">
                      {isSaved ? 'Saved' : 'Save'}
                    </span>
                  </motion.button>

                  {/* Share */}
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => sharePin(pin)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-surface-divider bg-elevated text-txt-secondary hover:text-txt-primary hover:border-surface-divider transition-all duration-150"
                    aria-label="Share pin"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6"  cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
                    </svg>
                    <span className="text-xs font-medium">Share</span>
                  </motion.button>
                </div>

                {/* Description */}
                {pin.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-txt-muted uppercase tracking-wide">About</h4>
                    <p className="text-sm text-txt-secondary leading-relaxed">{pin.description}</p>
                  </div>
                )}

                {/* Creator */}
                {pin.createdBy && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-elevated border border-surface-divider">
                    <Avatar
                      src={pin.createdBy.avatar}
                      name={pin.createdBy.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-txt-muted">Created by</p>
                      <p className="text-sm font-semibold text-txt-primary truncate">
                        {pin.createdBy.name}
                      </p>
                    </div>
                    {pin.createdAt && (
                      <time className="text-xs text-txt-muted flex-shrink-0" dateTime={pin.createdAt}>
                        {new Date(pin.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                )}

                {/* ── Reviews ─────────────────────────────────────────── */}
                <div className="space-y-4 pt-2 border-t border-surface-divider">
                  <h4 className="font-heading font-semibold text-txt-primary">
                    Reviews
                  </h4>

                  {/* Write a review */}
                  <ReviewForm
                    pinId={pin._id}
                    onSuccess={handleNewReview}
                  />

                  {/* Review list */}
                  <ReviewList
                    pinId={pin._id}
                    newReview={latestReview}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </Modal>
  );
}
