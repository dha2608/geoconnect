import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchFeed, clearPosts } from '../../features/posts/postSlice';
import { closePanel } from '../../features/ui/uiSlice';
import PostCard from './PostCard';
import LoadingSpinner from '../ui/LoadingSpinner';

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
const InboxIcon = () => (
  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 12h-6l-2 3H10l-2-3H2"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

// ─── Spring config ────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', damping: 26, stiffness: 210 };
const SCROLL_THRESHOLD = 150; // px from bottom to trigger next page

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col items-center justify-center h-full py-20 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center mb-5">
        <InboxIcon />
      </div>
      <p className="text-txt-primary font-heading font-semibold text-base mb-1">
        Nothing here yet
      </p>
      <p className="text-txt-muted font-body text-sm leading-relaxed max-w-[200px]">
        Be the first to share something with your community!
      </p>
    </motion.div>
  );
}

// ─── FeedPanel ────────────────────────────────────────────────────────────────

export default function FeedPanel() {
  const dispatch = useDispatch();
  const { posts, loading, hasMore, page, error } = useSelector((state) => state.posts);
  const { activePanel, isMobile } = useSelector((state) => state.ui);

  const scrollRef = useRef(null);
  const isOpen = activePanel === 'feed';

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
          >
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
            {!loading && !error && posts.length === 0 && <EmptyFeed />}

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
              <div className="flex justify-center py-6">
                <LoadingSpinner />
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
