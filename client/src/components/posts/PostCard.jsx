import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
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
import { togglePostLike } from '../../features/posts/postSlice';
import Avatar from '../ui/Avatar';
import GlassCard from '../ui/GlassCard';
import CommentSection from './CommentSection';

// ─── Image Grid ──────────────────────────────────────────────────────────────

function ImageGrid({ images }) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden">
        <img
          src={images[0]}
          alt="Post"
          className="w-full object-cover max-h-80 rounded-xl"
          loading="lazy"
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Post image ${i + 1}`}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  // 3+ images: first full-width, rest in a row (up to 3 visible, overflow counted)
  const [first, ...rest] = images;
  const visible = rest.slice(0, 3);
  const overflowCount = images.length - 4; // extras beyond the 4 we show

  return (
    <div className="mt-3 space-y-1.5 rounded-xl overflow-hidden">
      <img
        src={first}
        alt="Post image 1"
        className="w-full h-52 object-cover rounded-xl"
        loading="lazy"
      />
      <div className={`grid gap-1.5 ${visible.length === 1 ? 'grid-cols-1' : visible.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {visible.map((src, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden">
            <img
              src={src}
              alt={`Post image ${i + 2}`}
              className="w-full h-28 object-cover"
              loading="lazy"
            />
            {/* Overflow overlay on the last visible cell */}
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
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

const CONTENT_CHAR_LIMIT = 220;

export default function PostCard({ post }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isLiked = user?._id ? post.likes?.includes(user._id) : false;
  const likeCount = post.likes?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const contentIsLong =
    post.content &&
    (post.content.length > CONTENT_CHAR_LIMIT || post.content.split('\n').length > 3);

  const handleLike = () => {
    dispatch(togglePostLike(post._id));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.creator.username}`,
          text: post.content?.slice(0, 80),
        });
      } catch {
        // user cancelled
      }
    }
  };

  return (
    <motion.div layout className="mb-3">
      <GlassCard className="p-4">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={post.creator.avatar} name={post.creator.username} size="md" />
            <div className="min-w-0">
              <p className="text-txt-primary font-semibold font-body text-sm leading-tight truncate">
                {post.creator.username}
              </p>
              {post.locationName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-accent-primary flex-shrink-0" />
                  <span className="text-txt-muted text-xs font-body truncate">
                    {post.locationName}
                  </span>
                </div>
              )}
              <p className="text-txt-muted text-xs font-body mt-0.5">{timeAgo}</p>
            </div>
          </div>

          <button
            aria-label="More options"
            className="text-txt-muted hover:text-txt-secondary transition-colors p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0 ml-2"
          >
            <MoreHorizontal size={17} />
          </button>
        </div>

        {/* ── Content ── */}
        {post.content && (
          <div className="mb-1">
            <p
              className={`text-txt-primary font-body text-sm leading-relaxed whitespace-pre-wrap ${
                !expanded && contentIsLong ? 'line-clamp-3' : ''
              }`}
            >
              {post.content}
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

        {/* ── Image Grid ── */}
        <ImageGrid images={post.images} />

        {/* ── Stats bar ── */}
        {(likeCount > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <span className="text-txt-muted text-xs font-body">
              {likeCount > 0 && `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
            </span>
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
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium flex-1 justify-center transition-all ${
              isLiked
                ? 'text-accent-danger bg-accent-danger/10 hover:bg-accent-danger/15'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-white/5'
            }`}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
            </motion.div>
            Like
          </motion.button>

          {/* Comment */}
          <button
            onClick={() => setShowComments((s) => !s)}
            aria-label="Toggle comments"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium flex-1 justify-center transition-all ${
              showComments
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-white/5'
            }`}
          >
            <MessageCircle size={16} strokeWidth={2} />
            Comment
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            aria-label="Share post"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body font-medium flex-1 justify-center text-txt-secondary hover:text-txt-primary hover:bg-white/5 transition-all"
          >
            <Share2 size={16} strokeWidth={2} />
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
              <div className="mt-3 pt-3 border-t border-white/5">
                <CommentSection post={post} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}
