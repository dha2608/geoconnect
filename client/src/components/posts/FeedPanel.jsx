import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFeed, clearPosts, selectAllPosts, selectPostsLoading, selectPostsHasMore, selectPostsPage, selectPostsError } from '../../features/posts/postSlice';
import { closePanel } from '../../features/ui/uiSlice';
import PostCard from './PostCard';
import { PostCardSkeleton, EmptyState } from '../ui';

// ─── Pull-to-refresh constants ────────────────────────────────────────────────

const PULL_THRESHOLD = 64;   // px to pull before refresh triggers
const PULL_MAX = 100;        // max visual pull distance
const PULL_RESISTANCE = 0.45; // dampening factor for over-pull

// ─── Inline SVG icons (lucide-react not installed) ────────────────────────────

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const RssIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/>
    <circle cx="5" cy="19" r="1"/>
  </svg>
);

// ─── Spring config ────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', damping: 26, stiffness: 210 };
const SCROLL_THRESHOLD = 150; // px from bottom to trigger next page

// ─── FeedPanel ────────────────────────────────────────────────────────────────

export default function FeedPanel() {
  const dispatch = useDispatch();
  const posts   = useSelector(selectAllPosts);
  const loading = useSelector(selectPostsLoading);
  const hasMore = useSelector(selectPostsHasMore);
  const page    = useSelector(selectPostsPage);
  const error   = useSelector(selectPostsError);
  const { activePanel, isMobile } = useSelector((state) => state.ui);

  const scrollRef = useRef(null);
  const isOpen = activePanel === 'feed';

  // ── Pull-to-refresh state ──────────────────────────────────────────────────
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!scrollRef.current || scrollRef.current.scrollTop > 0 || refreshing) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || refreshing) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && scrollRef.current?.scrollTop === 0) {
      const dampened = Math.min(diff * PULL_RESISTANCE, PULL_MAX);
      setPullDistance(dampened);
    } else {
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6); // Hold at small offset while loading
      dispatch(clearPosts());
      await dispatch(fetchFeed({ page: 1 }));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, dispatch]);

  // Fetch first page when panel opens, clear on close
  useEffect(() => {
    if (isOpen) {
      dispatch(clearPosts());
      dispatch(fetchFeed({ page: 1 }));
    }
  }, [isOpen, dispatch]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      dispatch(fetchFeed({ page: page + 1 }));
    }
  }, [loading, hasMore, page, dispatch]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ── Responsive classes ───────────────────────────────────────────────────

  const panelClass = useMemo(
    () =>
      isMobile
        ? 'fixed top-16 bottom-16 left-0 right-0 z-20 glass overflow-hidden flex flex-col'
        : 'fixed top-16 bottom-0 left-[72px] w-[380px] z-20 glass border-r border-accent-primary/10 overflow-hidden flex flex-col',
    [isMobile]
  );

  const motionProps = useMemo(
    () =>
      isMobile
        ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit:    { opacity: 0, y: 20 },
            transition: { duration: 0.22, ease: 'easeOut' },
          }
        : {
            initial: { x: -380 },
            animate: { x: 0 },
            exit:    { x: -380 },
            transition: SPRING,
          },
    [isMobile]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="feed-panel"
          {...motionProps}
          className={panelClass}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-divider flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent-primary/15 flex items-center justify-center">
                <RssIcon />
              </div>
              <h2 className="text-txt-primary font-heading font-semibold text-base tracking-tight">
                Feed
              </h2>
              {posts.length > 0 && (
                <span className="bg-surface-hover text-txt-muted text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full">
                  {posts.length}
                </span>
              )}
            </div>

            <button
              onClick={() => dispatch(closePanel())}
              aria-label="Close feed"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all"
            >
              <XIcon />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 pt-3 pb-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchMove={isMobile ? handleTouchMove : undefined}
            onTouchEnd={isMobile ? handleTouchEnd : undefined}
          >
            {/* Pull-to-refresh indicator */}
            {isMobile && (pullDistance > 0 || refreshing) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, height: pullDistance > 0 ? pullDistance : 40 }}
                className="flex items-center justify-center overflow-hidden"
              >
                <motion.div
                  animate={{ rotate: refreshing ? 360 : (pullDistance / PULL_THRESHOLD) * 180 }}
                  transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={pullDistance >= PULL_THRESHOLD || refreshing ? '#3b82f6' : 'rgba(255,255,255,0.3)'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                </motion.div>
                {!refreshing && pullDistance >= PULL_THRESHOLD && (
                  <span className="text-[10px] text-accent-primary ml-2 font-body">Release to refresh</span>
                )}
                {refreshing && (
                  <span className="text-[10px] text-accent-primary ml-2 font-body">Refreshing...</span>
                )}
              </motion.div>
            )}
            {/* Error state */}
            {!loading && error && posts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-accent-danger/10 border border-accent-danger/15 flex items-center justify-center mb-5 text-accent-danger">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="text-txt-primary font-heading font-semibold text-base mb-1">
                  Failed to load feed
                </p>
                <p className="text-txt-muted font-body text-sm leading-relaxed max-w-[220px] mb-4">
                  {error || 'Something went wrong. Please try again.'}
                </p>
                <button
                  onClick={() => { dispatch(clearPosts()); dispatch(fetchFeed({ page: 1 })); }}
                  className="px-4 py-2 rounded-xl bg-accent-primary/15 text-accent-primary text-sm font-medium hover:bg-accent-primary/25 transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Empty state (only when not loading, no error, and no posts) */}
            {!loading && !error && posts.length === 0 && (
              <EmptyState
                icon="posts"
                title="No posts yet"
                description="Follow people or create your first post to see content here"
              />
            )}

            {/* Post list */}
            <AnimatePresence mode="popLayout">
              {posts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{
                    delay: i < 6 ? i * 0.045 : 0,
                    duration: 0.22,
                    ease: 'easeOut',
                  }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator (first load or paginating) */}
            {loading && (
              <div className="space-y-3">
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </div>
            )}

            {/* End-of-feed message */}
            {!loading && !hasMore && posts.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-txt-muted text-xs font-body text-center py-5"
              >
                You're all caught up in this area ✓
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
