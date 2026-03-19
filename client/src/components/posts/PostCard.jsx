import { useState, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import useRequireAuth from '../../hooks/useRequireAuth';
import ImageLightbox from '../ui/ImageLightbox';
import ReportModal from '../ui/ReportModal';
import { togglePostLike, savePost, unsavePost, repostPost, undoRepost, sharePost } from '../../features/posts/postSlice';
import { openModal } from '../../features/ui/uiSlice';
import Avatar from '../ui/Avatar';
import GlassCard from '../ui/GlassCard';
import CommentSection from './CommentSection';

/* ── Icon system ───────────────────────────────────────────────────────────── */

const PATHS = {
  heart:    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  comment:  'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  share:    ['M18 5a3 3 0 1 0 0 .001', 'M6 12a3 3 0 1 0 0 .001', 'M18 19a3 3 0 1 0 0 .001', 'M8.59 13.51l6.83 3.98', 'M15.41 6.51l-6.82 3.98'],
  pin:      ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'M12 10a3 3 0 1 0 0-.001'],
  more:     ['M12 12h.01', 'M19 12h.01', 'M5 12h.01'],
  pencil:   ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'],
  bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
  repost:   ['m2 9 3-3 3 3', 'M13 18H7a2 2 0 0 1-2-2V6', 'm22 15-3 3-3-3', 'M11 6h6a2 2 0 0 1 2 2v10'],
  globe:    ['M12 12a10 10 0 1 0 0-.001', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  users:    ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-.001', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  lock:     ['M3 11h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  flag:     ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22V15'],
};

function Icon({ name, size = 16, fill = 'none', strokeWidth = 1.75, className = '' }) {
  const d = PATHS[name];
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const VISIBILITY = {
  public:    { icon: 'globe',  label: 'Public' },
  followers: { icon: 'users',  label: 'Followers only' },
  private:   { icon: 'lock',   label: 'Only me' },
};

/* ── Image Grid ────────────────────────────────────────────────────────────── */

function ImageGrid({ images }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const open = (idx) => { setLightboxIndex(idx); setLightboxOpen(true); };
  const imgClass = 'w-full object-cover cursor-pointer hover:brightness-[0.88] transition-[filter] duration-200';

  return (
    <>
      {images.length === 1 && (
        <div className="mt-3 rounded-2xl overflow-hidden">
          <img src={images[0]} alt="Post" className={`${imgClass} max-h-80 rounded-2xl`}
            loading="lazy" onClick={() => open(0)} />
        </div>
      )}

      {images.length === 2 && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
          {images.map((src, i) => (
            <img key={i} src={src} alt={`Post image ${i + 1}`}
              className={`${imgClass} h-48`} loading="lazy" onClick={() => open(i)} />
          ))}
        </div>
      )}

      {images.length >= 3 && (() => {
        const [first, ...rest] = images;
        const visible = rest.slice(0, 3);
        const overflow = images.length - 4;
        return (
          <div className="mt-3 space-y-1 rounded-2xl overflow-hidden">
            <img src={first} alt="Post image 1" className={`${imgClass} h-52 rounded-2xl`}
              loading="lazy" onClick={() => open(0)} />
            <div className={`grid gap-1 ${visible.length === 1 ? 'grid-cols-1' : visible.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {visible.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden cursor-pointer" onClick={() => open(i + 1)}>
                  <img src={src} alt={`Post image ${i + 2}`} className={`${imgClass} h-28`} loading="lazy" />
                  {i === visible.length - 1 && overflow > 0 && (
                    <div className="absolute inset-0 bg-base/70 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-txt-primary text-xl font-semibold font-heading">+{overflow + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <ImageLightbox images={images} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </>
  );
}

/* ── Hashtag renderer ──────────────────────────────────────────────────────── */

function renderContent(text) {
  if (!text) return null;
  return text.split(/(#[\w\u00C0-\u024F]+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="text-accent-primary hover:underline cursor-pointer font-medium">{part}</span>
      : <span key={i}>{part}</span>,
  );
}

/* ── Count formatter ───────────────────────────────────────────────────────── */

function formatCount(n) {
  if (!n) return '';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ── Action Button (merged stats + action) ─────────────────────────────────── */

function ActionBtn({ icon, count, active, activeColor, activeBg, onClick, label, fillWhenActive = false, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-150
        ${active
          ? `${activeColor} ${activeBg}`
          : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-hover'
        }`}
    >
      {children || (
        <motion.div
          animate={active && fillWhenActive ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.25 }}
        >
          <Icon name={icon} size={15} fill={active && fillWhenActive ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </motion.div>
      )}
      {count > 0 && <span className="tabular-nums">{formatCount(count)}</span>}
    </motion.button>
  );
}

/* ── PostCard ──────────────────────────────────────────────────────────────── */

const CHAR_LIMIT = 220;

const PostCard = memo(function PostCard({ post }) {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();
  const user = useSelector((state) => state.auth.user);

  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isLiked    = user?._id ? post.likes?.includes(user._id) : false;
  const isSaved    = user?._id ? post.saves?.includes(user._id) : false;
  const isReposted = user?._id ? !!post.repostedByMe : false;
  const isAuthor   = user?._id && post.creator?._id === user._id;
  const isRepost   = !!post.repostOf;

  const likeCount     = post.likes?.length ?? 0;
  const commentCount  = post.commentCount ?? post.comments?.length ?? 0;
  const shareCountVal = post.shareCount ?? 0;

  const vis     = VISIBILITY[post.visibility] || VISIBILITY.public;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const isLong  = post.content && (post.content.length > CHAR_LIMIT || post.content.split('\n').length > 3);

  /* ── Handlers ── */
  const handleLike = async () => {
    if (!requireAuth('like posts')) return;
    const was = isLiked;
    try { await dispatch(togglePostLike(post._id)).unwrap(); if (!was) toast.success('Liked!', { duration: 1200 }); }
    catch { toast.error('Failed to like post'); }
  };

  const handleSave = async () => {
    if (!requireAuth('save posts')) return;
    try {
      if (isSaved) { await dispatch(unsavePost(post._id)).unwrap(); toast.success('Removed from saved', { duration: 1200 }); }
      else { await dispatch(savePost(post._id)).unwrap(); toast.success('Post saved!', { duration: 1200 }); }
    } catch { toast.error('Failed to save post'); }
  };

  const handleRepost = async () => {
    if (!requireAuth('repost')) return;
    if (isAuthor) { toast.error('Cannot repost your own post'); return; }
    try {
      if (isReposted) { await dispatch(undoRepost(post._id)).unwrap(); toast.success('Repost removed', { duration: 1200 }); }
      else { await dispatch(repostPost({ id: post._id })).unwrap(); toast.success('Reposted!', { duration: 1200 }); }
    } catch (err) { toast.error(err?.message || 'Failed to repost'); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/map?post=${post._id}`;
    dispatch(sharePost(post._id)).catch(() => {});
    if (navigator.share) {
      try { await navigator.share({ title: `Post by ${post.creator?.name ?? 'User'}`, text: post.content?.slice(0, 80), url }); }
      catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('Link copied!', { duration: 1500 }); }
      catch { toast.error('Failed to copy link'); }
    }
  };

  const author = isRepost ? post.repostOf?.author : post.creator;

  return (
    <motion.div layout className="mb-3">
      <GlassCard className="p-4">

        {/* ── Repost attribution ── */}
        {isRepost && post.repostOf && (
          <div className="flex items-center gap-2 mb-2.5 text-txt-muted text-xs font-body">
            <Icon name="repost" size={13} />
            <span><span className="font-medium text-txt-secondary">{post.creator?.name}</span> reposted</span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar src={author?.avatar} name={author?.name} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-txt-primary font-semibold font-body text-sm leading-tight truncate">
                {author?.name}
              </p>
              <span className="text-txt-muted/40 text-xs">·</span>
              <p className="text-txt-muted text-xs font-body flex-shrink-0">{timeAgo}</p>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {post.locationName && (
                <div className="flex items-center gap-1">
                  <Icon name="pin" size={11} className="text-accent-primary flex-shrink-0" />
                  <span className="text-txt-muted text-xs font-body truncate max-w-[140px]">{post.locationName}</span>
                </div>
              )}
              {post.locationName && <span className="text-txt-muted/30 text-[10px]">·</span>}
              <span title={vis.label} className="text-txt-muted">
                <Icon name={vis.icon} size={11} />
              </span>
            </div>
          </div>

          {/* ── Header actions (edit + more) ── */}
          <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5">
            {isAuthor && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => dispatch(openModal({ type: 'editPost', data: post }))}
                aria-label="Edit post"
                className="p-1.5 rounded-lg text-txt-muted hover:text-accent-primary hover:bg-accent-primary/8 transition-colors">
                <Icon name="pencil" size={14} />
              </motion.button>
            )}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} aria-label="More options"
                aria-haspopup="true" aria-expanded={showMenu}
                className="p-1.5 rounded-lg text-txt-muted hover:text-txt-secondary hover:bg-surface-hover transition-colors">
                <Icon name="more" size={16} strokeWidth={3} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div role="menu"
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-40 glass rounded-xl border border-surface-divider shadow-lg z-20 py-1.5 overflow-hidden"
                    ref={(el) => { if (el) el.querySelector('[role="menuitem"]')?.focus(); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); setShowMenu(false); }
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const items = e.currentTarget.querySelectorAll('[role="menuitem"]');
                        const idx = Array.from(items).indexOf(document.activeElement);
                        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
                        items[next]?.focus();
                      }
                    }}>
                    {!isAuthor && (
                      <button role="menuitem" tabIndex={0}
                        onClick={() => { setShowMenu(false); setReportOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-txt-secondary hover:text-accent-danger hover:bg-surface-hover transition-colors">
                        <Icon name="flag" size={13} /> Report
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
            </div>
          </div>
        </div>

        {/* ── Repost body ── */}
        {isRepost && post.repostOf && (
          <div className="mb-3 p-3 rounded-xl border border-surface-divider bg-surface-hover/40">
            {post.repostOf.text && (
              <p className="text-txt-primary font-body text-sm leading-relaxed whitespace-pre-wrap">
                {renderContent(post.repostOf.text)}
              </p>
            )}
            {post.repostOf.images?.length > 0 && <ImageGrid images={post.repostOf.images} />}
          </div>
        )}

        {/* ── Content ── */}
        {post.content && (
          <div className="mb-1">
            <p className={`text-txt-primary font-body text-sm leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
              {renderContent(post.content)}
            </p>
            {isLong && (
              <button onClick={() => setExpanded(e => !e)}
                className="text-accent-primary text-xs font-body mt-1 hover:underline focus:outline-none">
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* ── Hashtags ── */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.hashtags.map(tag => (
              <span key={tag}
                className="text-accent-primary bg-accent-primary/8 rounded-full px-2.5 py-0.5 text-[11px] font-body font-medium cursor-pointer hover:bg-accent-primary/15 transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Images ── */}
        {!isRepost && <ImageGrid images={post.images} />}

        {/* ── Merged action bar ── */}
        <div className="flex items-center gap-0.5 mt-3 pt-3 border-t border-surface-divider">
          {/* Like */}
          <ActionBtn
            icon="heart" count={likeCount} active={isLiked}
            activeColor="text-accent-danger" activeBg="bg-accent-danger/10"
            onClick={handleLike} label={isLiked ? 'Unlike' : 'Like'}
            fillWhenActive
          />

          {/* Comment */}
          <ActionBtn
            icon="comment" count={commentCount} active={showComments}
            activeColor="text-accent-primary" activeBg="bg-accent-primary/10"
            onClick={() => setShowComments(s => !s)} label="Toggle comments"
          />

          {/* Repost */}
          {!isAuthor && (
            <ActionBtn
              icon="repost" count={0} active={isReposted}
              activeColor="text-accent-success" activeBg="bg-accent-success/10"
              onClick={handleRepost} label={isReposted ? 'Undo repost' : 'Repost'}
            />
          )}

          {/* Share */}
          <ActionBtn
            icon="share" count={shareCountVal} active={false}
            activeColor="" activeBg=""
            onClick={handleShare} label="Share"
          />

          {/* Spacer pushes save to far right */}
          <div className="flex-1" />

          {/* Save */}
          <ActionBtn
            icon="bookmark" count={0} active={isSaved}
            activeColor="text-accent-warning" activeBg="bg-accent-warning/10"
            onClick={handleSave} label={isSaved ? 'Unsave' : 'Save'}
            fillWhenActive
          />
        </div>

        {/* ── Comments ── */}
        <AnimatePresence initial={false}>
          {showComments && (
            <motion.div key="comments"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-surface-divider">
                <CommentSection post={post} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post._id} />
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
