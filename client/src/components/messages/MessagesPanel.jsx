/**
 * MessagesPanel.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Full chat side panel: conversation list ↔ active chat, real-time via socket.
 * Renders only when state.ui.activePanel === 'messages'.
 *
 * Layout
 *   • Spring slide-in from left, left-[72px] (desktop) / full-width (mobile)
 *   • Width 380 px, top-16 → bottom-0
 *   • Glass morphism consistent with other panels
 *
 * Two views (AnimatePresence swap):
 *   1. ConversationList — fetched on open, click opens chat
 *   2. ActiveChat       — messages + typing indicator + input bar
 *
 * Socket integration:
 *   • useMessaging() → { joinConversation, sendMessage, startTyping, stopTyping }
 *   • Joins conversation room on view switch
 *   • startTyping / stopTyping on input
 *
 * Features
 *   • Auto-scroll to latest message
 *   • Date separators between message groups
 *   • Own vs other message bubbles
 *   • Location-pin message preview
 *   • Animated typing indicator (3 bouncing dots)
 *   • Loading skeletons + empty states
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  setActiveConversation,
  createConversation,
  markConversationRead,
  fetchUnreadCount,
  removeMessage,
} from '../../features/messages/messageSlice';
import { closePanel } from '../../features/ui/uiSlice';
import { messageApi } from '../../api/messageApi';
import { userApi } from '../../api/userApi';
import useRequireAuth from '../../hooks/useRequireAuth';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import Avatar from '../ui/Avatar';

// Gracefully handle missing socket hook (created in parallel)
let useMessaging;
try {
  useMessaging = require('../../socket/useMessaging').default;
} catch {
  useMessaging = () => ({
    joinConversation: () => {},
    sendMessage:      () => {},
    startTyping:      () => {},
    stopTyping:       () => {},
  });
}

// ─── Spring ───────────────────────────────────────────────────────────────────

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.85 };

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const MessageSquareIcon = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const UserPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the other participant in a 1-on-1 conversation */
function getOtherParticipant(conversation, currentUserId) {
  if (!conversation?.participants) return null;
  return (
    conversation.participants.find(
      (p) => (p._id ?? p) !== currentUserId,
    ) ?? conversation.participants[0]
  );
}

/** Format date separator label */
function formatDateLabel(date) {
  const d = new Date(date);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

/** Truncate string to maxLen characters */
function truncate(str = '', maxLen = 40) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

// ─── Loading skeletons ────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-full bg-surface-hover flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-surface-hover rounded-md w-3/5" />
        <div className="h-2.5 bg-surface-hover rounded-md w-4/5" />
      </div>
      <div className="h-2 bg-surface-hover rounded w-10 flex-shrink-0" />
    </div>
  );
}

function MessageSkeleton({ align = 'left' }) {
  const isRight = align === 'right';
  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div
        className={`h-8 rounded-2xl bg-surface-hover ${isRight ? 'w-36' : 'w-48'}`}
      />
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyConversations() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="flex flex-col items-center justify-center h-full py-20 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center mb-5 text-txt-muted">
        <MessageSquareIcon className="w-8 h-8" />
      </div>
      <p className="text-txt-primary font-heading font-semibold text-base mb-1">
        No conversations yet
      </p>
      <p className="text-txt-muted font-body text-sm leading-relaxed max-w-[200px]">
        Start a conversation by visiting someone's profile.
      </p>
    </motion.div>
  );
}

function EmptyMessages({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col items-center justify-center h-full py-16 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center mb-4 text-txt-muted">
        <MessageSquareIcon className="w-7 h-7" />
      </div>
      <p className="text-txt-secondary font-body text-sm">
        Start the conversation with{' '}
        <span className="text-txt-primary font-medium">{name}</span>
      </p>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-1">
      <div
        className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-sm"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-txt-muted block"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-surface-divider" />
      <span className="text-[11px] font-medium text-txt-muted uppercase tracking-wider">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-surface-divider" />
    </div>
  );
}

// ─── Read receipt icons ───────────────────────────────────────────────────────

/** Single check = sent/delivered */
const SingleCheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <polyline points="2 8.5 6 12.5 14 4.5" />
  </svg>
);

/** Double check = read by recipient */
const DoubleCheckIcon = ({ read }) => (
  <svg viewBox="0 0 20 16" fill="none" stroke={read ? '#60a5fa' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3">
    <polyline points="1 8.5 5 12.5 13 4.5" />
    <polyline points="5 8.5 9 12.5 17 4.5" />
  </svg>
);

// ─── Single message bubble ────────────────────────────────────────────────────

function MessageBubble({ message, isOwn, otherParticipantId, onDelete }) {
  const time = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  const isLocation = message.type === 'location' || message.type === 'pin';

  // Determine read status for own messages
  const readBy = message.readBy || [];
  const isReadByOther = isOwn && otherParticipantId
    ? readBy.some(id => (id._id ?? id).toString() === otherParticipantId.toString())
    : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex items-end gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'} group`}
    >
      {/* Delete button — own messages only, slides in on hover */}
      {isOwn && onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete message"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                     w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0
                     text-txt-muted hover:text-accent-danger hover:bg-surface-hover"
        >
          <TrashIcon />
        </button>
      )}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Bubble */}
        {isLocation ? (
          // Location pin message
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-[13px] font-body ${
              isOwn
                ? 'rounded-br-sm text-white'
                : 'rounded-bl-sm text-txt-primary border border-[var(--glass-border)]'
            }`}
            style={
              isOwn
                ? { background: '#3b82f6', boxShadow: '0 2px 12px rgba(59,130,246,0.35)' }
                : { background: 'var(--glass-bg)' }
            }
          >
            <MapPinIcon />
            <span className="font-medium">
              {message.location?.name || message.text || 'Shared a location'}
            </span>
          </div>
        ) : (
          // Text message
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-[13px] font-body leading-relaxed break-words ${
              isOwn
                ? 'rounded-br-sm text-white'
                : 'rounded-bl-sm text-txt-primary border border-[var(--glass-border)]'
            }`}
            style={
              isOwn
                ? { background: '#3b82f6', boxShadow: '0 2px 12px rgba(59,130,246,0.3)' }
                : { background: 'var(--glass-bg)' }
            }
          >
            {message.text}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px] text-txt-muted font-body">{time}</span>
          {isOwn && (
            <span className="text-txt-muted flex-shrink-0">
              {isReadByOther ? <DoubleCheckIcon read /> : <SingleCheckIcon />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── NewConversationView ──────────────────────────────────────────────────────

function NewConversationView({ currentUserId, onClose, onBack, onStartChat }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState('');
  const debounceRef             = useRef(null);
  const inputRef                = useRef(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setError('');
      return;
    }

    setSearching(true);
    setError('');

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await userApi.searchUsers(trimmed);
        const users = (res.data || []).filter(u => u._id !== currentUserId);
        setResults(users);
      } catch {
        setError('Search failed. Try again.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  return (
    <motion.div
      key="new-conversation"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-surface-divider">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.08, x: -1 }}
              whileTap={{ scale: 0.92 }}
              onClick={onBack}
              aria-label="Back to conversations"
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all duration-150"
            >
              <ArrowLeftIcon />
            </motion.button>
            <h2 className="text-[15px] font-bold text-txt-primary font-heading tracking-tight">
              New Message
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted
                       hover:text-txt-primary hover:bg-surface-hover transition-all duration-150"
          >
            <XIcon />
          </button>
        </div>

        {/* Search input */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <span className="text-txt-muted flex-shrink-0"><SearchIcon /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people by name..."
            className="flex-1 bg-transparent text-[13px] text-txt-primary font-body
                       placeholder-txt-muted outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="text-txt-muted hover:text-txt-primary transition-colors"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-2 pb-4 min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
      >
        {/* Loading */}
        {searching && (
          <div className="space-y-1 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-400 font-body py-4">{error}</p>
        )}

        {/* No results */}
        {!searching && !error && query.trim().length >= 2 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center mb-4 text-txt-muted">
              <UserPlusIcon />
            </div>
            <p className="text-txt-secondary font-body text-sm">
              No users found for "<span className="text-txt-primary font-medium">{query.trim()}</span>"
            </p>
          </motion.div>
        )}

        {/* Prompt */}
        {!searching && query.trim().length < 2 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center mb-4 text-txt-muted">
              <UserPlusIcon />
            </div>
            <p className="text-txt-primary font-heading font-semibold text-base mb-1">
              Find someone to chat with
            </p>
            <p className="text-txt-muted font-body text-sm leading-relaxed max-w-[220px]">
              Search by name to start a new conversation.
            </p>
          </motion.div>
        )}

        {/* User results */}
        {results.length > 0 && (
          <AnimatePresence initial={false}>
            {results.map((user, i) => (
              <motion.button
                key={user._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i < 6 ? i * 0.04 : 0, duration: 0.18 }}
                whileHover={{ scale: 1.012, x: 2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onStartChat(user._id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left
                           border border-[var(--glass-border)] bg-transparent
                           hover:bg-surface-hover transition-all duration-200 mb-1"
              >
                <Avatar src={user.avatar} name={user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-txt-primary font-body truncate">
                    {user.name}
                  </p>
                  {user.bio && (
                    <p className="text-[11px] text-txt-muted font-body truncate">
                      {truncate(user.bio, 50)}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-accent-primary font-body font-medium flex-shrink-0">
                  Chat
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── ConversationListView ─────────────────────────────────────────────────────

function ConversationListView({ currentUserId, onClose, onSelectConversation, onCompose }) {
  const dispatch = useDispatch();
  const { conversations, loading, error } = useSelector((s) => s.messages);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  return (
    <motion.div
      key="conversation-list"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 border-b border-surface-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/15 flex items-center justify-center text-accent-primary">
              <MessageSquareIcon className="w-4 h-4" />
            </div>
            <h2 className="text-[15px] font-bold text-txt-primary font-heading tracking-tight">
              Messages
            </h2>
            {conversations.length > 0 && (
              <span className="bg-surface-hover text-txt-muted text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onCompose}
              aria-label="New message"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted
                         hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-150"
            >
              <ComposeIcon />
            </button>
            <button
              onClick={onClose}
              aria-label="Close messages"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted
                         hover:text-txt-primary hover:bg-surface-hover transition-all duration-150"
            >
              <XIcon />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-2 pb-4 min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
      >
        {/* Loading */}
        {loading && conversations.length === 0 && (
          <div className="space-y-1 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && conversations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent-danger/10 border border-accent-danger/15 flex items-center justify-center mb-4 text-accent-danger">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <p className="text-txt-primary font-heading font-semibold text-base mb-1">Failed to load messages</p>
            <p className="text-txt-muted font-body text-sm mb-4">{typeof error === 'string' ? error : 'Please check your connection and try again.'}</p>
            <button
              onClick={() => dispatch(fetchConversations())}
              className="px-4 py-2 rounded-xl bg-accent-primary/15 text-accent-primary text-sm font-medium hover:bg-accent-primary/25 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Empty */}
        {!loading && !error && conversations.length === 0 && <EmptyConversations />}

        {/* Conversation rows */}
        {conversations.length > 0 && (
          <AnimatePresence initial={false}>
            {conversations.map((conv, i) => {
              const other      = getOtherParticipant(conv, currentUserId);
              const name       = other?.name || 'Unknown';
              const avatar     = other?.avatar;
              const isOnline   = other?.isOnline ?? false;
              const lastMsg    = conv.lastMessage;
              const hasUnread  = (conv.unreadCount ?? 0) > 0;
              const timeLabel  = conv.updatedAt
                ? formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })
                : '';

              return (
                <motion.button
                  key={conv._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i < 6 ? i * 0.04 : 0, duration: 0.18 }}
                  whileHover={{ scale: 1.012, x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onSelectConversation(conv)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left',
                    'border transition-all duration-200 mb-1',
                    hasUnread
                      ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-surface-active'
                      : 'border-[var(--glass-border)] bg-transparent hover:bg-surface-hover',
                  ].join(' ')}
                >
                  <Avatar
                    src={avatar}
                    name={name}
                    size="md"
                    online={isOnline}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-[13px] font-body truncate ${
                          hasUnread ? 'font-semibold text-txt-primary' : 'font-medium text-txt-secondary'
                        }`}
                      >
                        {name}
                      </span>
                      <span className="text-[10px] text-txt-muted flex-shrink-0 font-body">
                        {timeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] text-txt-muted font-body truncate flex-1">
                        {lastMsg?.text
                          ? truncate(lastMsg.text, 40)
                          : lastMsg?.type === 'location'
                          ? '📍 Shared a location'
                          : 'No messages yet'}
                      </p>
                      {hasUnread && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.6)' }}
                        />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── ActiveChatView ───────────────────────────────────────────────────────────

function ActiveChatView({ conversation, currentUserId, onBack, onClose }) {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();
  const { messages, loading, typingUsers } = useSelector((s) => s.messages);

  const { joinConversation, sendMessage: socketSend, startTyping, stopTyping } =
    useMessaging();

  const [inputText, setInputText]     = useState('');
  const [isSending, setIsSending]     = useState(false);
  const messagesEndRef                = useRef(null);
  const typingTimeoutRef              = useRef(null);
  const inputRef                      = useRef(null);

  const other     = getOtherParticipant(conversation, currentUserId);
  const name      = other?.name || 'User';
  const avatar    = other?.avatar;
  const isOnline  = other?.isOnline ?? false;
  const convId    = conversation._id;

  const typingList  = typingUsers[convId] ?? [];
  const othersTyping = typingList.filter((id) => id !== currentUserId);

  // Fetch messages + join socket room
  useEffect(() => {
    dispatch(fetchMessages({ conversationId: convId }));
    joinConversation(convId);
    return () => {
      // Clean up typing on unmount
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      stopTyping(convId);
    };
  }, [convId, dispatch, joinConversation, stopTyping]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, othersTyping.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Message grouping by date ───────────────────────────────────────────────

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate  = null;

    messages.forEach((msg) => {
      const msgDate = msg.createdAt ? new Date(msg.createdAt) : null;
      if (msgDate && (!lastDate || !isSameDay(msgDate, lastDate))) {
        groups.push({ type: 'separator', date: msgDate, key: `sep-${msgDate.toISOString()}` });
        lastDate = msgDate;
      }
      groups.push({ type: 'message', data: msg, key: msg._id });
    });

    return groups;
  }, [messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e) => {
      setInputText(e.target.value);

      // Typing indicator: debounce stopTyping
      startTyping(convId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => stopTyping(convId), 2000);
    },
    [convId, startTyping, stopTyping],
  );

  const handleSend = useCallback(async () => {
    if (!requireAuth('send messages')) return;
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);

    // Stop typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping(convId);

    try {
      // HTTP persist
      await dispatch(sendMessage({ conversationId: convId, text }));
      // Real-time socket broadcast
      socketSend({ conversationId: convId, text });
    } catch {
      // Restore input on failure
      setInputText(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, isSending, convId, dispatch, socketSend, stopTyping]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleDeleteMessage = useCallback(
    async (messageId) => {
      try {
        await messageApi.deleteMessage(convId, messageId);
        dispatch(removeMessage(messageId));
        toast.success('Message deleted');
      } catch {
        toast.error('Failed to delete message');
      }
    },
    [convId, dispatch],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      key="active-chat"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col h-full"
    >
      {/* ── Chat Header ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-3 py-3
                   border-b border-surface-divider"
      >
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.08, x: -1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          aria-label="Back to conversations"
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all duration-150"
        >
          <ArrowLeftIcon />
        </motion.button>

        {/* Avatar + name */}
        <Avatar src={avatar} name={name} size="sm" online={isOnline} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-txt-primary font-body truncate leading-tight">
            {name}
          </p>
          <p className="text-[11px] font-body">
            {isOnline ? (
              <span className="text-accent-success">Online</span>
            ) : (
              <span className="text-txt-muted">Offline</span>
            )}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close messages"
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all duration-150"
        >
          <XIcon />
        </button>
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 min-h-0 flex flex-col gap-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
      >
        {/* Loading skeletons */}
        {loading && messages.length === 0 && (
          <div className="flex flex-col gap-3 pt-2">
            <MessageSkeleton align="left"  />
            <MessageSkeleton align="right" />
            <MessageSkeleton align="left"  />
            <MessageSkeleton align="right" />
            <MessageSkeleton align="left"  />
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && <EmptyMessages name={name} />}

        {/* Message groups */}
        <AnimatePresence initial={false}>
          {groupedMessages.map((item) => {
            if (item.type === 'separator') {
              return <DateSeparator key={item.key} date={item.date} />;
            }

            const msg   = item.data;
            const isOwn = (msg.sender?._id ?? msg.sender) === currentUserId;

            return (
              <MessageBubble
                key={item.key}
                message={msg}
                isOwn={isOwn}
                otherParticipantId={other?._id}
                onDelete={isOwn ? () => handleDeleteMessage(msg._id) : undefined}
              />
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {othersTyping.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-end gap-2 p-3
                   border-t border-surface-divider"
      >
        <div
          className="flex-1 flex items-end rounded-xl px-3.5 py-2.5 min-h-[42px]"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            aria-label="Message input"
            className="flex-1 bg-transparent text-[13px] text-txt-primary font-body
                       placeholder-txt-muted resize-none outline-none leading-relaxed
                       max-h-24 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
            onInput={(e) => {
              // Auto-grow textarea
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
            }}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileHover={inputText.trim() ? { scale: 1.06 } : {}}
          whileTap={inputText.trim() ? { scale: 0.92 } : {}}
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          aria-label="Send message"
          className={[
            'w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0',
            'transition-all duration-150',
            inputText.trim() && !isSending
              ? 'bg-accent-primary text-white shadow-[0_0_16px_rgba(59,130,246,0.4)] hover:bg-blue-500'
              : 'bg-surface-hover text-txt-muted cursor-not-allowed',
          ].join(' ')}
        >
          {isSending ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <SendIcon />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── MessagesPanel (root) ─────────────────────────────────────────────────────

export default function MessagesPanel() {
  const dispatch = useDispatch();
  const { activeConversation } = useSelector((s) => s.messages);
  const { activePanel, isMobile } = useSelector((s) => s.ui);
  const currentUser = useSelector((s) => s.auth?.user);

  const [showNewConversation, setShowNewConversation] = useState(false);
  const isOpen = activePanel === 'messages';

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      dispatch(setActiveConversation(null));
      setShowNewConversation(false);
    }
  }, [isOpen, dispatch]);

  const handleClose = useCallback(() => dispatch(closePanel()), [dispatch]);

  const handleSelectConversation = useCallback(
    (conv) => {
      setShowNewConversation(false);
      dispatch(setActiveConversation(conv));
      dispatch(fetchMessages({ conversationId: conv._id }));
      dispatch(markConversationRead(conv._id)).then(() => dispatch(fetchUnreadCount()));
    },
    [dispatch],
  );

  const handleBack = useCallback(
    () => {
      dispatch(setActiveConversation(null));
      setShowNewConversation(false);
    },
    [dispatch],
  );

  const handleCompose = useCallback(() => {
    dispatch(setActiveConversation(null));
    setShowNewConversation(true);
  }, [dispatch]);

  const handleStartChat = useCallback(async (recipientId) => {
    try {
      const result = await dispatch(createConversation(recipientId)).unwrap();
      setShowNewConversation(false);
      dispatch(setActiveConversation(result));
      dispatch(fetchMessages({ conversationId: result._id }));
      dispatch(markConversationRead(result._id)).then(() => dispatch(fetchUnreadCount()));
    } catch {
      // Error handled by Redux rejection — stays on search view
    }
  }, [dispatch]);

  // Determine current view
  const currentView = activeConversation
    ? 'chat'
    : showNewConversation
    ? 'new'
    : 'list';

  // ── Responsive layout ──────────────────────────────────────────────────────

  const panelClass = isMobile
    ? 'fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col overflow-hidden glass'
    : 'fixed top-16 bottom-0 left-[72px] w-[380px] z-30 flex flex-col overflow-hidden glass border-r border-[var(--glass-border)]';

  const motionProps = isMobile
    ? {
        initial:    { opacity: 0, y: 24 },
        animate:    { opacity: 1, y: 0  },
        exit:       { opacity: 0, y: 24 },
        transition: { duration: 0.22, ease: 'easeOut' },
      }
    : {
        initial:    { x: -380 },
        animate:    { x: 0    },
        exit:       { x: -380 },
        transition: SPRING,
      };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="messages-panel"
          role="complementary"
          aria-label="Messages"
          {...motionProps}
          className={panelClass}
        >
          {/* Swap between list, new conversation, and chat with AnimatePresence */}
          <AnimatePresence mode="wait" initial={false}>
            {currentView === 'list' && (
              <ConversationListView
                key="conv-list"
                currentUserId={currentUser?._id}
                onClose={handleClose}
                onSelectConversation={handleSelectConversation}
                onCompose={handleCompose}
              />
            )}
            {currentView === 'new' && (
              <NewConversationView
                key="new-conv"
                currentUserId={currentUser?._id}
                onClose={handleClose}
                onBack={handleBack}
                onStartChat={handleStartChat}
              />
            )}
            {currentView === 'chat' && (
              <ActiveChatView
                key={`chat-${activeConversation._id}`}
                conversation={activeConversation}
                currentUserId={currentUser?._id}
                onBack={handleBack}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
