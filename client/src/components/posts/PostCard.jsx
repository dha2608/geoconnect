import { useState, useEffect, useRef, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import useRequireAuth from '../../hooks/useRequireAuth';
import ImageLightbox from '../ui/ImageLightbox';
import ReportModal from '../ui/ReportModal';
// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const Heart = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const MessageCircle = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
);
const Share2 = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
);
const MapPin = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const MoreHorizontal = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
);
const Pencil = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);
const Bookmark = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
);
const Repeat2 = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
);
const GlobeIcon = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);
const UsersIcon = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const LockIcon = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const VISIBILITY_ICONS = { public: GlobeIcon, followers: UsersIcon, private: LockIcon };
const VISIBILITY_LABELS = { public: 'Public', followers: 'Followers only', private: 'Only me' };
import { togglePostLike, savePost, unsavePost, repostPost, undoRepost, sharePost } from '../../features/posts/postSlice';
import { openModal } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';
import GlassCard from '../ui/GlassCard';
import CommentSection from './CommentSection';

// ─── Image Grid ──────────────────────────────────────────────────────────────

function ImageGrid({ images }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (idx) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const imgClass = 'w-full object-cover cursor-pointer hover:brightness-90 transition-[filter] duration-150';

  return (
    <>
      {images.length === 1 && (
        <div className="mt-3 rounded-xl overflow-hidden">
          <img
            src={images[0]}
            alt="Post"
            className={`${imgClass} max-h-80 rounded-xl`}
            loading="lazy"
            onClick={() => openLightbox(0)}
          />
        </div>
      )}

      {images.length === 2 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Post image ${i + 1}`}
              className={`${imgClass} h-48`}
              loading="lazy"
              onClick={() => openLightbox(i)}
            />
          ))}
        </div>
      )}

      {images.length >= 3 && (() => {
        const [first, ...rest] = images;
        const visible = rest.slice(0, 3);
        const overflowCount = images.length - 4;

        return (
          <div className="mt-3 space-y-1.5 rounded-xl overflow-hidden">
            <img
              src={first}
              alt="Post image 1"
              className={`${imgClass} h-52 rounded-xl`}
              loading="lazy"
              onClick={() => openLightbox(0)}
            />
            <div className={`grid gap-1.5 ${visible.length === 1 ? 'grid-cols-1' : visible.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {visible.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden cursor-pointer" onClick={() => openLightbox(i + 1)}>
                  <img
                    src={src}
                    alt={`Post image ${i + 2}`}
                    className={`${imgClass} h-28`}
                    loading="lazy"
                  />
                  {i === visible.length - 1 && overflowCount > 0 && (
                    <div className="absolute inset-0 bg-base/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
                      <span className="text-txt-primary text-xl font-semibold font-heading">
                        +{overflowCount + 1}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

const CONTENT_CHAR_LIMIT = 220;

// ─── Hashtag-aware content renderer ──────────────────────────────────────────
function renderContent(text) {
  if (!text) return null;
  const parts = text.split(/(#[\w\u00C0-\u024F]+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} className="text-accent-primary hover:underline cursor-pointer font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const PostCard = memo(function PostCard({ post }) {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();
  const user = useSelector((state) => state.auth.user);

  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isLiked       = user?._id ? post.likes?.includes(user._id) : false;
  const isSaved       = user?._id ? post.saves?.includes(user._id) : false;
  const isReposted    = user?._id ? !!post.repostedByMe : false;
  const likeCount     = post.likes?.length ?? 0;
  const commentCount  = post.commentCount ?? post.comments?.length ?? 0;
  const saveCount     = post.saves?.length ?? 0;
  const shareCountVal = post.shareCount ?? 0;
  const isAuthor      = user?._id && post.creator?._id === user._id;
  const isRepost      = !!post.repostOf;

  const VisIcon = VISIBILITY_ICONS[post.visibility] || GlobeIcon;
  const visLabel = VISIBILITY_LABELS[post.visibility] || 'Public';

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const contentIsLong =
    post.content &&
    (post.content.length > CONTENT_CHAR_LIMIT || post.content.split('\n').length > 3);

  const handleLike = async () => {
    if (!requireAuth('like posts')) return;
    const wasLiked = isLiked;
    try {
      await dispatch(togglePostLike(post._id)).unwrap();
      if (!wasLiked) toast.success('Liked!', { duration: 1200 });
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleSave = async () => {
    if (!requireAuth('save posts')) return;
    try {
      if (isSaved) {
        await dispatch(unsavePost(post._id)).unwrap();
        toast.success('Removed from saved', { duration: 1200 });
      } else {
        await dispatch(savePost(post._id)).unwrap();
        toast.success('Post saved!', { duration: 1200 });
      }
    } catch {
      toast.error('Failed to save post');
    }
  };

  const handleRepost = async () => {
    if (!requireAuth('repost')) return;
    if (isAuthor) { toast.error('Cannot repost your own post'); return; }
    try {
      if (isReposted) {
        await dispatch(undoRepost(post._id)).unwrap();
        toast.success('Repost removed', { duration: 1200 });
      } else {
        await dispatch(repostPost({ id: post._id })).unwrap();
        toast.success('Reposted!', { duration: 1200 });
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to repost');
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/?post=${post._id}`;
    // Track share on server
    dispatch(sharePost(post._id)).catch(() => {});
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.creator?.name ?? 'User'}`,
          text: post.content?.slice(0, 80),
          url: postUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        toast.success('Link copied!', { duration: 1500 });
      } catch {
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <motion.div layout className="mb-3">
      <GlassCard className="p-4">

        {/* ── Repost header ── */}
        {isRepost && post.repostOf && (
          <div className="flex items-center gap-2 mb-2 text-txt-muted text-xs font-body">
            <Repeat2 size={13} />
            <span>
              <span className="font-medium text-txt-secondary">{post.creator?.name}</span> reposted
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={isRepost ? post.repostOf?.author?.avatar : post.creator?.avatar}
              name={isRepost ? post.repostOf?.author?.name : post.creator?.name}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-txt-primary font-semibold font-body text-sm leading-tight truncate">
                {isRepost ? post.repostOf?.author?.name : post.creator?.name}
              </p>
              {post.locationName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-accent-primary flex-shrink-0" />
                  <span className="text-txt-muted text-xs font-body truncate">
                    {post.locationName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-txt-muted text-xs font-body">{timeAgo}</p>
                <span className="text-txt-muted/40">·</span>
                <span title={visLabel} className="text-txt-muted">
                  <VisIcon size={11} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            {/* Save button — header */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSave}
              aria-label={isSaved ? 'Unsave post' : 'Save post'}
              className={`p-1.5 rounded-lg transition-colors ${
                isSaved
                  ? 'text-accent-warning bg-accent-warning/10'
                  : 'text-txt-muted hover:text-accent-warning hover:bg-accent-warning/10'
              }`}
            >
              <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
            </motion.button>

            {/* Edit button — only shown to the post author */}
            {isAuthor && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => dispatch(openModal({ type: 'editPost', data: post }))}
                aria-label="Edit post"
                className="text-txt-muted hover:text-accent-primary transition-colors p-1.5 rounded-lg hover:bg-accent-primary/10"
              >
                <Pencil size={15} />
              </motion.button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={showMenu}
                className="text-txt-muted hover:text-txt-secondary transition-colors p-1.5 rounded-lg hover:bg-surface-hover"
              >
                <MoreHorizontal size={17} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-36 glass rounded-xl border border-surface-divider shadow-lg z-20 py-1 overflow-hidden"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); setShowMenu(false); }
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const items = e.currentTarget.querySelectorAll('[role="menuitem"]');
                        const idx = Array.from(items).indexOf(document.activeElement);
                        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
                        items[next]?.focus();
                      }
                    }}
                    ref={(el) => { if (el) { const first = el.querySelector('[role="menuitem"]'); first?.focus(); } }}
                  >
                    {!isAuthor && (
                      <button
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => { setShowMenu(false); setReportOpen(true); }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-txt-secondary hover:text-accent-danger hover:bg-surface-hover transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" y1="22" x2="4" y2="15"/>
                        </svg>
                        Report
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Close menu on outside click */}
              {showMenu && (
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              )}
            </div>
          </div>
        </div>

        {/* ── Repost: original post content ── */}
        {isRepost && post.repostOf && (
          <div className="mb-3 p-3 rounded-xl border border-surface-divider bg-surface-hover/50">
            {post.repostOf.text && (
              <p className="text-txt-primary font-body text-sm leading-relaxed whitespace-pre-wrap">
                {renderContent(post.repostOf.text)}
              </p>
            )}
            {post.repostOf.images?.length > 0 && (
              <ImageGrid images={post.repostOf.images} />
            )}
          </div>
        )}

        {/* ── Content (with hashtag highlighting) ── */}
        {post.content && (
          <div className="mb-1">
            <p
              className={`text-txt-primary font-body text-sm leading-relaxed whitespace-pre-wrap ${
                !expanded && contentIsLong ? 'line-clamp-3' : ''
              }`}
            >
              {renderContent(post.content)}
            </p>
            {contentIsLong && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-accent-primary text-xs font-body mt-1 hover:underline focus:outline-none"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* ── Hashtags row ── */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-accent-primary bg-accent-primary/10 rounded-full px-2 py-0.5 text-[11px] font-body font-medium cursor-pointer hover:bg-accent-primary/20 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Image Grid ── */}
        {!isRepost && <ImageGrid images={post.images} />}

        {/* ── Stats bar ── */}
        {(likeCount > 0 || commentCount > 0 || saveCount > 0 || shareCountVal > 0) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-divider">
            <div className="flex items-center gap-3">
              {likeCount > 0 && (
                <span className="text-txt-muted text-xs font-body">
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </span>
              )}
              {saveCount > 0 && (
                <span className="text-txt-muted text-xs font-body">
                  {saveCount} {saveCount === 1 ? 'save' : 'saves'}
                </span>
              )}
              {shareCountVal > 0 && (
                <span className="text-txt-muted text-xs font-body">
                  {shareCountVal} {shareCountVal === 1 ? 'share' : 'shares'}
                </span>
              )}
            </div>
            {commentCount > 0 && (
              <button
                onClick={() => setShowComments((s) => !s)}
                className="text-txt-muted text-xs font-body hover:text-txt-secondary transition-colors"
              >
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        )}

        {/* ── Actions bar ── */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-surface-divider">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium flex-1 justify-center transition-all ${
              isLiked
                ? 'text-accent-danger bg-accent-danger/10 hover:bg-accent-danger/15'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
            </motion.div>
            Like
          </motion.button>

          {/* Comment */}
          <button
            onClick={() => setShowComments((s) => !s)}
            aria-label="Toggle comments"
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium flex-1 justify-center transition-all ${
              showComments
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            <MessageCircle size={15} strokeWidth={2} />
            Comment
          </button>

          {/* Repost */}
          {!isAuthor && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleRepost}
              aria-label={isReposted ? 'Undo repost' : 'Repost'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium flex-1 justify-center transition-all ${
                isReposted
                  ? 'text-accent-success bg-accent-success/10 hover:bg-accent-success/15'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Repeat2 size={15} strokeWidth={2} />
              Repost
            </motion.button>
          )}

          {/* Share */}
          <button
            onClick={handleShare}
            aria-label="Share post"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium flex-1 justify-center text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-all"
          >
            <Share2 size={15} strokeWidth={2} />
            Share
          </button>
        </div>

        {/* ── Comment Section ── */}
        <AnimatePresence initial={false}>
          {showComments && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-surface-divider">
                <CommentSection post={post} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post._id}
      />
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
