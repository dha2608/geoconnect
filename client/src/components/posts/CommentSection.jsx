import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const Send = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);
const MessageSquare = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
import { addComment } from '../../features/posts/postSlice';
import Avatar from '../ui/Avatar';

// ─── Single Comment Row ───────────────────────────────────────────────────────

function CommentRow({ comment, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="flex items-start gap-2.5"
    >
      <Avatar
        src={comment.user.avatar}
        name={comment.user.username}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-3 py-2">
          <span className="text-txt-primary text-xs font-semibold font-body leading-none block mb-1">
            {comment.user.username}
          </span>
          <p className="text-txt-secondary text-sm font-body leading-relaxed break-words">
            {comment.text}
          </p>
        </div>
        <p className="text-txt-muted text-[10px] font-body mt-1 ml-2">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

export default function CommentSection({ post }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (listRef.current && post.comments.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [post.comments.length]);

  // Focus the input when the section mounts
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      await dispatch(addComment({ id: post._id, data: { text: trimmed } })).unwrap();
      setText('');
    } catch (err) {
      setError('Failed to post comment. Please try again.');
      console.error('[CommentSection] addComment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasComments = post.comments.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Comment list ── */}
      {!hasComments ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-5 gap-2"
        >
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <MessageSquare size={18} className="text-txt-muted" />
          </div>
          <p className="text-txt-muted text-xs font-body">
            No comments yet — be the first!
          </p>
        </motion.div>
      ) : (
        <div
          ref={listRef}
          className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          <AnimatePresence initial={false}>
            {post.comments.map((comment, i) => (
              <CommentRow key={comment._id} comment={comment} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-accent-danger text-xs font-body px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Input row ── */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Avatar src={user?.avatar} name={user?.username} size="sm" />

        <div
          className={`flex-1 flex items-center gap-2 bg-white/5 border rounded-full px-3 py-2 transition-colors ${
            submitting
              ? 'border-white/5 opacity-60'
              : 'border-white/10 focus-within:border-accent-primary/40'
          }`}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment…"
            maxLength={500}
            disabled={submitting}
            className="flex-1 bg-transparent text-txt-primary text-sm font-body outline-none placeholder:text-txt-muted disabled:cursor-not-allowed min-w-0"
          />

          <motion.button
            type="submit"
            whileTap={{ scale: 0.85 }}
            disabled={!text.trim() || submitting}
            aria-label="Send comment"
            className="text-accent-primary disabled:text-txt-muted transition-colors disabled:cursor-not-allowed flex-shrink-0"
          >
            {submitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-accent-primary/30 border-t-accent-primary rounded-full"
              />
            ) : (
              <Send size={15} strokeWidth={2} />
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
