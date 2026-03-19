import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const Send = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);
const MessageSquare = ({ className, size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const HeartIcon = ({ filled, className, size = 14, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const PencilIcon = ({ className, size = 12, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);
const CheckIcon = ({ className, size = 12, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XIcon = ({ className, size = 12, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const SmileIcon = ({ className, size = 12, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const ReplyIcon = ({ className, size = 12, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);
const ChevronIcon = ({ className, size = 12, expanded, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} {...props}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

import {
  addComment, deleteComment, editComment, likeComment, unlikeComment,
  replyToComment, fetchReplies, deleteReply,
  addCommentReaction, removeCommentReaction,
} from '../../features/posts/postSlice';
import useRequireAuth from '../../hooks/useRequireAuth';
import Avatar from '../ui/Avatar';
import ConfirmDialog from '../ui/ConfirmDialog';

const ALLOWED_REACTIONS = ['❤️', '😂', '👍', '👎', '😮', '😢', '🔥'];

// ─── Reaction Display ─────────────────────────────────────────────────────────

function ReactionBadges({ reactions = [], currentUserId, onToggle }) {
  const groups = useMemo(() => {
    const map = {};
    for (const r of reactions) {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, hasOwn: false };
      map[r.emoji].count++;
      const uid = typeof r.user === 'string' ? r.user : r.user?._id;
      if (uid === currentUserId) map[r.emoji].hasOwn = true;
    }
    return Object.values(map);
  }, [reactions, currentUserId]);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {groups.map((g) => (
        <motion.button
          key={g.emoji}
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggle(g.emoji, g.hasOwn)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
            g.hasOwn
              ? 'bg-accent-primary/15 border-accent-primary/30 text-accent-primary'
              : 'bg-surface-hover border-surface-divider text-txt-muted hover:border-accent-primary/20'
          }`}
        >
          <span>{g.emoji}</span>
          {g.count > 1 && <span>{g.count}</span>}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Reaction Picker ──────────────────────────────────────────────────────────

function ReactionPicker({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      className="absolute bottom-full mb-1 left-0 z-20 flex gap-0.5 px-1.5 py-1 bg-elevated border border-surface-divider rounded-full shadow-lg"
    >
      {ALLOWED_REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.25 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="w-6 h-6 flex items-center justify-center text-sm hover:bg-surface-hover rounded-full transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── Reply Row (no nesting) ───────────────────────────────────────────────────

function ReplyRow({ reply, postId, parentCommentId, currentUserId, postAuthorId }) {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOwner = currentUserId && (
    (typeof reply.user === 'object' ? reply.user._id : reply.user) === currentUserId
  );
  const isPostAuthor = currentUserId && postAuthorId === currentUserId;
  const canDelete = isOwner || isPostAuthor;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await dispatch(deleteReply({ postId, commentId: parentCommentId, replyId: reply._id })).unwrap();
      toast.success('Reply deleted');
    } catch {
      toast.error('Failed to delete reply');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const userName = typeof reply.user === 'object' ? (reply.user.name || reply.user.username) : 'User';
  const userAvatar = typeof reply.user === 'object' ? reply.user.avatar : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-start gap-2 group"
    >
      <Avatar src={userAvatar} name={userName} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="bg-surface-hover/60 border border-surface-divider/60 rounded-xl rounded-tl-sm px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-txt-primary text-[11px] font-semibold font-body leading-none">{userName}</span>
            {canDelete && (
              <>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setConfirmOpen(true)}
                  disabled={deleting}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-txt-muted hover:text-accent-danger transition-all duration-150 disabled:opacity-40"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6m4-6v6" />
                  </svg>
                </motion.button>
                <ConfirmDialog
                  isOpen={confirmOpen}
                  onClose={() => setConfirmOpen(false)}
                  onConfirm={handleDelete}
                  title="Delete reply?"
                  message="This action cannot be undone."
                  confirmText="Delete"
                  variant="danger"
                  loading={deleting}
                />
              </>
            )}
          </div>
          <p className="text-txt-secondary text-xs font-body leading-relaxed break-words mt-0.5">{reply.text}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 ml-2">
          <p className="text-txt-muted text-[9px] font-body">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
          </p>
          {reply.isEdited && (
            <span className="text-txt-muted text-[9px] font-body italic">edited</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Single Comment Row ───────────────────────────────────────────────────────

function CommentRow({ comment, index, postId, currentUserId, postAuthorId }) {
  const dispatch = useDispatch();
  const { requireAuth, AuthGate } = useRequireAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const editRef = useRef(null);

  // Like state
  const likes = comment.likes || [];
  const isLiked = currentUserId && likes.some(
    (id) => (typeof id === 'string' ? id : id?._id) === currentUserId
  );
  const likeCount = likes.length;
  const [liking, setLiking] = useState(false);

  // Reaction state
  const [showReactions, setShowReactions] = useState(false);

  // Reply state
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const replyInputRef = useRef(null);

  const replyCount = comment.replyCount || 0;

  const isOwner = currentUserId && (
    comment.user._id === currentUserId || comment.user === currentUserId
  );
  const isPostAuthor = currentUserId && postAuthorId === currentUserId;
  const canDelete = isOwner || isPostAuthor;
  const canEdit = isOwner;

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [editing]);

  // Focus reply input
  useEffect(() => {
    if (replying && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replying]);

  // Close reaction picker on outside click
  useEffect(() => {
    if (!showReactions) return;
    const close = () => setShowReactions(false);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [showReactions]);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await dispatch(deleteComment({ postId, commentId: comment._id })).unwrap();
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text || saving) return;
    setSaving(true);
    try {
      await dispatch(editComment({ postId, commentId: comment._id, text: trimmed })).unwrap();
      setEditing(false);
      toast.success('Comment updated');
    } catch {
      toast.error('Failed to update comment');
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditText(comment.text); }
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      if (isLiked) {
        await dispatch(unlikeComment({ postId, commentId: comment._id })).unwrap();
      } else {
        await dispatch(likeComment({ postId, commentId: comment._id })).unwrap();
      }
    } catch {
      toast.error('Failed to update like');
    } finally {
      setLiking(false);
    }
  };

  // ── Reaction handlers ──
  const handleReactionToggle = useCallback(async (emoji, hasOwn) => {
    if (!currentUserId) return;
    try {
      if (hasOwn) {
        await dispatch(removeCommentReaction({ postId, commentId: comment._id })).unwrap();
      } else {
        await dispatch(addCommentReaction({ postId, commentId: comment._id, emoji })).unwrap();
      }
    } catch {
      toast.error('Failed to update reaction');
    }
  }, [dispatch, postId, comment._id, currentUserId]);

  const handleReactionSelect = useCallback(async (emoji) => {
    if (!currentUserId) return;
    try {
      await dispatch(addCommentReaction({ postId, commentId: comment._id, emoji })).unwrap();
    } catch {
      toast.error('Failed to add reaction');
    }
  }, [dispatch, postId, comment._id, currentUserId]);

  // ── Reply handlers ──
  const handleToggleReplies = useCallback(async () => {
    if (!showReplies && !repliesLoaded && replyCount > 0) {
      setRepliesLoading(true);
      try {
        const result = await dispatch(fetchReplies({ postId, commentId: comment._id })).unwrap();
        setReplies(result.data || result || []);
        setRepliesLoaded(true);
      } catch {
        toast.error('Failed to load replies');
      } finally {
        setRepliesLoading(false);
      }
    }
    setShowReplies((prev) => !prev);
  }, [showReplies, repliesLoaded, replyCount, dispatch, postId, comment._id]);

  const handleReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || replySubmitting) return;
    if (!requireAuth('reply to comments')) return;
    setReplySubmitting(true);
    try {
      const result = await dispatch(replyToComment({ postId, commentId: comment._id, text: trimmed })).unwrap();
      setReplyText('');
      setReplying(false);
      // Add to local replies
      const newReply = result.data || result;
      setReplies((prev) => [...prev, newReply]);
      setRepliesLoaded(true);
      if (!showReplies) setShowReplies(true);
      toast.success('Reply posted');
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }
    if (e.key === 'Escape') { setReplying(false); setReplyText(''); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="flex items-start gap-2.5 group"
    >
      {AuthGate}
      <Avatar
        src={comment.user.avatar}
        name={comment.user.name || comment.user.username}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-surface-hover border border-surface-divider rounded-2xl rounded-tl-sm px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-txt-primary text-xs font-semibold font-body leading-none">
              {comment.user.name || comment.user.username}
            </span>
            <div className="flex items-center gap-1">
              {/* Edit button */}
              {canEdit && !editing && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEditing(true); setEditText(comment.text); }}
                  title="Edit comment"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-txt-muted hover:text-accent-primary transition-all duration-150"
                >
                  <PencilIcon size={11} />
                </motion.button>
              )}
              {/* Delete button */}
              {canDelete && !editing && (
                <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setConfirmOpen(true)}
                  disabled={deleting}
                  title="Delete comment"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-txt-muted hover:text-accent-danger transition-all duration-150 disabled:opacity-40"
                >
                  {deleting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border border-accent-danger/30 border-t-accent-danger rounded-full"
                    />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6m4-6v6" />
                    </svg>
                  )}
                </motion.button>
                <ConfirmDialog
                  isOpen={confirmOpen}
                  onClose={() => setConfirmOpen(false)}
                  onConfirm={handleDelete}
                  title="Delete comment?"
                  message="This action cannot be undone."
                  confirmText="Delete"
                  variant="danger"
                  loading={deleting}
                />
                </>
              )}
            </div>
          </div>

          {/* Comment text or edit input */}
          {editing ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                maxLength={500}
                disabled={saving}
                className="flex-1 bg-base/50 text-txt-primary text-sm font-body outline-none rounded-lg px-2 py-1 border border-accent-primary/30 focus:border-accent-primary/60 transition-colors min-w-0"
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleEdit}
                disabled={saving || !editText.trim() || editText.trim() === comment.text}
                title="Save"
                className="p-1 rounded text-accent-success hover:bg-accent-success/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border border-accent-primary/30 border-t-accent-primary rounded-full"
                  />
                ) : (
                  <CheckIcon size={13} />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => { setEditing(false); setEditText(comment.text); }}
                disabled={saving}
                title="Cancel"
                className="p-1 rounded text-txt-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors disabled:opacity-40"
              >
                <XIcon size={13} />
              </motion.button>
            </div>
          ) : (
            <p className="text-txt-secondary text-sm font-body leading-relaxed break-words mt-1">
              {comment.text}
            </p>
          )}

          {/* Reaction badges inside bubble */}
          <ReactionBadges
            reactions={comment.reactions || []}
            currentUserId={currentUserId}
            onToggle={handleReactionToggle}
          />
        </div>

        {/* Meta row: timestamp, edited, like, react, reply */}
        <div className="flex items-center gap-3 mt-1 ml-2">
          <p className="text-txt-muted text-[10px] font-body">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </p>
          {comment.isEdited && (
            <span className="text-txt-muted text-[10px] font-body italic">edited</span>
          )}
          {/* Like button */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            disabled={liking || !currentUserId}
            className={`flex items-center gap-1 text-[10px] font-body transition-colors ${
              isLiked ? 'text-accent-danger' : 'text-txt-muted hover:text-accent-danger'
            } disabled:cursor-not-allowed`}
          >
            <HeartIcon filled={isLiked} size={12} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </motion.button>
          {/* Reaction button */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
              disabled={!currentUserId}
              className="text-txt-muted hover:text-accent-primary text-[10px] font-body transition-colors disabled:cursor-not-allowed"
              title="React"
            >
              <SmileIcon size={12} />
            </motion.button>
            <AnimatePresence>
              {showReactions && (
                <ReactionPicker
                  onSelect={handleReactionSelect}
                  onClose={() => setShowReactions(false)}
                />
              )}
            </AnimatePresence>
          </div>
          {/* Reply button */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => { if (!requireAuth('reply to comments')) return; setReplying(!replying); }}
            className="flex items-center gap-1 text-[10px] font-body text-txt-muted hover:text-accent-primary transition-colors"
          >
            <ReplyIcon size={11} />
            <span>Reply</span>
          </motion.button>
        </div>

        {/* Reply input */}
        <AnimatePresence>
          {replying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-1.5 ml-2"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Write a reply…"
                  maxLength={500}
                  disabled={replySubmitting}
                  className="flex-1 bg-surface-hover text-txt-primary text-xs font-body outline-none rounded-full px-3 py-1.5 border border-surface-divider focus:border-accent-primary/40 transition-colors min-w-0"
                />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleReply}
                  disabled={!replyText.trim() || replySubmitting}
                  className="text-accent-primary disabled:text-txt-muted transition-colors disabled:cursor-not-allowed flex-shrink-0"
                >
                  {replySubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border border-accent-primary/30 border-t-accent-primary rounded-full"
                    />
                  ) : (
                    <Send size={13} />
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { setReplying(false); setReplyText(''); }}
                  className="text-txt-muted hover:text-accent-danger transition-colors flex-shrink-0"
                >
                  <XIcon size={11} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies toggle + list */}
        {replyCount > 0 && (
          <div className="mt-1.5 ml-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleReplies}
              className="flex items-center gap-1.5 text-[10px] font-body text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              <ChevronIcon size={10} expanded={showReplies} />
              <span>
                {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
              {repliesLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-2.5 h-2.5 border border-accent-primary/30 border-t-accent-primary rounded-full"
                />
              )}
            </motion.button>

            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-1.5 flex flex-col gap-2 pl-2 border-l-2 border-surface-divider/50"
                >
                  {replies.map((reply) => (
                    <ReplyRow
                      key={reply._id}
                      reply={reply}
                      postId={postId}
                      parentCommentId={comment._id}
                      currentUserId={currentUserId}
                      postAuthorId={postAuthorId}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

export default function CommentSection({ post }) {
  const dispatch = useDispatch();
  const { requireAuth, AuthGate } = useRequireAuth();
  const user = useSelector((state) => state.auth.user);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const comments = post.comments || [];

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (listRef.current && comments.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Focus the input when the section mounts
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!requireAuth('post comments')) return;
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      await dispatch(addComment({ id: post._id, data: { text: trimmed } })).unwrap();
      setText('');
      toast.success('Comment posted!');
    } catch (err) {
      setError('Failed to post comment. Please try again.');
      toast.error('Failed to post comment');
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

  const hasComments = comments.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {AuthGate}
      {/* ── Comment list ── */}
      {!hasComments ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-5 gap-2"
        >
          <div className="w-9 h-9 rounded-xl bg-surface-hover flex items-center justify-center">
            <MessageSquare size={18} className="text-txt-muted" />
          </div>
          <p className="text-txt-muted text-xs font-body">
            No comments yet — be the first!
          </p>
        </motion.div>
      ) : (
        <div
          ref={listRef}
          className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          <AnimatePresence initial={false}>
            {comments.map((comment, i) => (
              <CommentRow
                key={comment._id}
                comment={comment}
                index={i}
                postId={post._id}
                currentUserId={user?._id}
                postAuthorId={post.author?._id || post.author}
              />
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
        <Avatar src={user?.avatar} name={user?.name} size="sm" />

        <div
          className={`flex-1 flex items-center gap-2 bg-surface-hover border rounded-full px-3 py-2 transition-colors ${
            submitting
              ? 'border-surface-divider opacity-60'
              : 'border-surface-divider focus-within:border-accent-primary/40'
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
