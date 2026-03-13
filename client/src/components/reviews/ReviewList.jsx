import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import useRequireAuth from '../../hooks/useRequireAuth';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Sort Options ──────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: '🕐' },
  { key: 'highest', label: 'Highest Rated', icon: '⭐' },
  { key: 'helpful', label: 'Most Helpful', icon: '👍' },
];
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { reviewApi } from '../../api/reviewApi';
import StarRating from './StarRating';
import Avatar from '../ui/Avatar';

/* ─── Skeleton ──────────────────────────────────────────────────────────── */
function ReviewSkeleton({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="glass rounded-xl p-4 space-y-3 animate-pulse"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-active flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-surface-active rounded-md w-28" />
          <div className="h-2 bg-surface-hover rounded-md w-16" />
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-4 h-4 rounded bg-surface-active" />
          ))}
        </div>
      </div>
      <div className="space-y-2 pl-11">
        <div className="h-2.5 bg-surface-active rounded-md w-full" />
        <div className="h-2.5 bg-surface-hover rounded-md w-4/5" />
        <div className="h-2.5 bg-surface-hover rounded-md w-3/5" />
      </div>
    </motion.div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────────────── */
function EmptyReviews() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-10 text-center space-y-3"
    >
      <div className="text-4xl">⭐</div>
      <div className="space-y-1">
        <p className="text-txt-secondary text-sm font-medium">No reviews yet</p>
        <p className="text-txt-muted text-xs">Be the first to share your experience!</p>
      </div>
    </motion.div>
  );
}

/* ─── Single Review Card ────────────────────────────────────────────────── */
function ReviewCard({ review, currentUserId, onDelete, onVoteHelpful }) {
  const [deleting, setDeleting] = useState(false);
  const isOwner = currentUserId && review.user?._id === currentUserId;
  const hasVoted = !!(currentUserId && review.helpfulVotes?.includes(currentUserId));
  const voteCount = review.helpfulVotes?.length || 0;

  const handleDelete = async () => {
    if (!window.confirm('Delete your review?')) return;
    setDeleting(true);
    try {
      await onDelete(review._id);
    } finally {
      setDeleting(false);
    }
  };

  const formattedDate = (() => {
    try {
      return formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });
    } catch {
      return 'recently';
    }
  })();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      className="glass rounded-xl p-4 space-y-3 group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={review.user?.avatar}
            name={review.user?.name ?? 'User'}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-txt-primary truncate">
              {review.user?.name ?? 'Anonymous'}
            </p>
            <time className="text-xs text-txt-muted" dateTime={review.createdAt}>
              {formattedDate}
            </time>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StarRating value={review.rating} readonly size="sm" />

          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              disabled={deleting}
              title="Delete review"
              className={`
                p-1.5 rounded-lg transition-all duration-150
                opacity-0 group-hover:opacity-100
                hover:bg-accent-danger/10 text-txt-muted hover:text-accent-danger
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {deleting ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6m4-6v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Rating label */}
      {review.rating && (
        <div className="pl-11">
          <span className="inline-block text-xs font-medium text-accent-warning/80 bg-accent-warning/10 rounded-full px-2 py-0.5">
            {['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'][review.rating]}
          </span>
        </div>
      )}

      {/* Review text */}
      <p className="text-sm text-txt-secondary leading-relaxed pl-11">{review.text}</p>

      {/* Footer: helpful vote */}
      <div className="flex items-center pl-11 pt-1">
        <button
          onClick={() => onVoteHelpful(review)}
          title={hasVoted ? 'Remove helpful vote' : 'Mark as helpful'}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
            hasVoted
              ? 'text-accent-primary bg-accent-primary/10'
              : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-hover'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {voteCount > 0 && <span>{voteCount}</span>}
          <span>Helpful</span>
        </button>
      </div>
    </motion.article>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function ReviewList({ pinId, newReview }) {
  const user = useSelector((state) => state.auth.user);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const LIMIT = 10;

  // Client-side sort — applied after fetch
  const sortedReviews = useMemo(() => {
    const copy = [...reviews];
    switch (sortBy) {
      case 'highest':
        return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'helpful':
        return copy.sort(
          (a, b) => (b.helpfulVotes?.length || 0) - (a.helpfulVotes?.length || 0),
        );
      case 'newest':
      default:
        return copy.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
    }
  }, [reviews, sortBy]);

  const fetchReviews = useCallback(
    async (pageNum = 1, append = false) => {
      if (!pinId) return;

      pageNum === 1 ? setLoading(true) : setLoadingMore(true);
      setError(null);

      try {
        const res = await reviewApi.getReviews(pinId, { page: pageNum, limit: LIMIT });
        const data = res.data;
        const list = data?.reviews ?? data ?? [];
        const total = data?.total ?? list.length;

        setReviews((prev) => (append ? [...prev, ...list] : list));
        setHasMore(pageNum * LIMIT < total);
        setPage(pageNum);
      } catch {
        setError('Failed to load reviews. Please try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pinId],
  );

  // Initial fetch
  useEffect(() => {
    fetchReviews(1, false);
  }, [fetchReviews]);

  // Prepend new review from ReviewForm without re-fetching
  useEffect(() => {
    if (!newReview) return;
    setReviews((prev) => {
      // Guard against duplicates
      if (prev.some((r) => r._id === newReview._id)) return prev;
      return [newReview, ...prev];
    });
  }, [newReview]);

  const handleDelete = async (reviewId) => {
    try {
      await reviewApi.deleteReview(pinId, reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      toast.success('Review deleted.');
    } catch {
      toast.error('Failed to delete review.');
      throw new Error('Delete failed');
    }
  };

  const requireAuth = useRequireAuth();
  const handleVoteHelpful = useCallback(
    async (review) => {
      if (!requireAuth('vote on reviews')) return;
      const hasVoted = review.helpfulVotes?.includes(user?._id);
      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => {
          if (r._id !== review._id) return r;
          const votes = hasVoted
            ? (r.helpfulVotes || []).filter((id) => id !== user._id)
            : [...(r.helpfulVotes || []), user._id];
          return { ...r, helpfulVotes: votes };
        }),
      );
      try {
        if (hasVoted) {
          await reviewApi.unvoteHelpful(pinId, review._id);
        } else {
          await reviewApi.voteHelpful(pinId, review._id);
        }
      } catch {
        toast.error('Failed to update vote.');
        // Revert optimistic update
        setReviews((prev) =>
          prev.map((r) => (r._id === review._id ? review : r)),
        );
      }
    },
    [pinId, user, requireAuth],
  );

  /* ── Render ── */
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 0.05, 0.1].map((d, i) => (
          <ReviewSkeleton key={i} delay={d} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl p-5 text-center space-y-3"
      >
        <p className="text-accent-danger text-sm">{error}</p>
        <button
          onClick={() => fetchReviews(1)}
          className="text-xs text-accent-primary hover:underline"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  if (!reviews.length) return <EmptyReviews />;

  return (
    <div className="space-y-3">
      {/* Summary row + sort */}
      <div className="flex items-center justify-between px-1">
        <h4 className="text-sm font-semibold text-txt-primary font-heading">
          {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
        </h4>

        {/* Sort dropdown */}
        {reviews.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                title={opt.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  sortBy === opt.key
                    ? 'bg-accent-primary/15 text-accent-primary shadow-sm'
                    : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-active'
                }`}
              >
                <span className="text-[10px]">{opt.icon}</span>
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <AnimatePresence mode="popLayout">
        {sortedReviews.map((review) => (
          <ReviewCard
            key={review._id}
            review={review}
            currentUserId={user?._id}
            onDelete={handleDelete}
            onVoteHelpful={handleVoteHelpful}
          />
        ))}
      </AnimatePresence>

      {/* Load more */}
      {hasMore && (
        <motion.button
          layout
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => fetchReviews(page + 1, true)}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl border border-surface-divider text-sm text-txt-secondary hover:text-txt-primary hover:border-accent-primary/30 transition-all duration-150 disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more reviews'}
        </motion.button>
      )}
    </div>
  );
}
