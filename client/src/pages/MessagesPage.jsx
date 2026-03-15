/**
 * MessagesPage.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Full-page messaging view — desktop split layout, mobile single-view swap.
 *
 * Reuses the same Redux messages slice + useMessaging socket hook as the
 * side-panel MessagesPanel, but renders inline instead of as an overlay.
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  editMessage,
  addReaction,
  removeReaction,
  setActiveConversation,
  createConversation,
  markConversationRead,
  fetchUnreadCount,
  removeMessage,
  updateMessage,
  selectConversations,
  selectActiveConversation,
  selectMessages,
  selectMessagesLoading,
  selectTypingUsers,
} from '../features/messages/messageSlice';
import useMessaging from '../socket/useMessaging';
import * as messageApi from '../api/messageApi';
import * as userApi from '../api/userApi';
import GlassCard from '../components/ui/GlassCard';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const formatTime = (d) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatMsgTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const formatDateSeparator = (d) => {
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - date) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

const shouldShowDateSep = (msgs, i) => {
  if (i === 0) return true;
  const prev = new Date(msgs[i - 1].createdAt).toDateString();
  const curr = new Date(msgs[i].createdAt).toDateString();
  return prev !== curr;
};

/* ─── SVG Icons ──────────────────────────────────────────────────────────── */
const IconBack = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const IconSend = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IconPlus = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
  </svg>
);
const IconImage = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

/* ─── Typing Indicator ───────────────────────────────────────────────────── */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 pb-2">
      <div className="glass rounded-2xl rounded-bl-md px-4 py-2.5 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
});

/* ─── Date Separator ─────────────────────────────────────────────────────── */
const DateSeparator = memo(function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] text-white/40 font-medium tracking-wide uppercase">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
});

/* ─── Message Bubble ─────────────────────────────────────────────────────── */
const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '👎', '🔥'];

const MessageBubble = memo(function MessageBubble({ msg, isOwn, onEdit, onDelete, onReaction }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-0.5`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      <div className={`relative max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
            isOwn
              ? 'bg-blue-600/80 text-white rounded-br-md'
              : 'glass text-white/90 rounded-bl-md'
          }`}
        >
          {msg.images?.length > 0 && (
            <div className={`grid gap-1 mb-1.5 ${msg.images.length > 1 ? 'grid-cols-2' : ''}`}>
              {msg.images.map((img, i) => (
                <img key={i} src={img} alt="" className="rounded-lg max-h-48 object-cover w-full" loading="lazy" />
              ))}
            </div>
          )}
          {msg.text && <p>{msg.text}</p>}
          {msg.isEdited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
          <span className={`text-[10px] block mt-0.5 ${isOwn ? 'text-white/50 text-right' : 'text-white/40'}`}>
            {formatMsgTime(msg.createdAt)}
          </span>
        </div>

        {/* Reactions display */}
        {msg.reactions?.length > 0 && (
          <div className={`flex gap-0.5 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.map((r, i) => (
              <span key={i} className="text-xs glass rounded-full px-1.5 py-0.5">{r.emoji}</span>
            ))}
          </div>
        )}

        {/* Hover actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute top-0 ${isOwn ? '-left-20' : '-right-20'} flex gap-1`}
            >
              <button onClick={() => setShowReactions(!showReactions)} className="glass rounded-full p-1.5 text-xs hover:bg-white/10" title="React">😊</button>
              {isOwn && (
                <>
                  <button onClick={() => onEdit(msg)} className="glass rounded-full p-1.5 text-xs hover:bg-white/10" title="Edit">✏️</button>
                  <button onClick={() => onDelete(msg._id)} className="glass rounded-full p-1.5 text-xs hover:bg-white/10" title="Delete">🗑️</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} glass rounded-full px-2 py-1 flex gap-1 z-10`}
            >
              {REACTIONS.map((r) => (
                <button key={r} onClick={() => { onReaction(msg._id, r); setShowReactions(false); }} className="hover:scale-125 transition-transform text-sm">{r}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

/* ─── Conversation Item ──────────────────────────────────────────────────── */
const ConversationItem = memo(function ConversationItem({ conv, currentUserId, isActive, onClick }) {
  const other = conv.participants?.find((p) => p._id !== currentUserId) || conv.participants?.[0];
  const unread = conv.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="relative shrink-0">
        {other?.avatar ? (
          <img src={other.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {other?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-white truncate">{other?.name || 'Unknown'}</span>
          {conv.lastMessage?.createdAt && (
            <span className="text-[10px] text-white/40 ml-2 shrink-0">{formatTime(conv.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5">
          {conv.lastMessage?.text || 'No messages yet'}
        </p>
      </div>
    </button>
  );
});

/* ─── Empty State ────────────────────────────────────────────────────────── */
const EmptyChat = memo(function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full glass flex items-center justify-center mb-4">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-white/40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>
      <h3 className="text-white/70 font-medium mb-1">Select a conversation</h3>
      <p className="text-white/40 text-sm">Choose from your existing conversations or start a new one</p>
    </div>
  );
});

/* ─── New Conversation Search ────────────────────────────────────────────── */
function NewConversationView({ currentUserId, onSelect, onCancel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await userApi.searchUsers(query);
        setResults((data.data || data).filter((u) => u._id !== currentUserId));
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, currentUserId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">New Message</h3>
          <button onClick={onCancel} className="text-white/50 hover:text-white text-sm">Cancel</button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"><IconSearch /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full glass rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {searching && <p className="text-center text-white/40 text-sm py-6">Searching...</p>}
        {!searching && results.length === 0 && query.trim() && (
          <p className="text-center text-white/40 text-sm py-6">No users found</p>
        )}
        {results.map((user) => (
          <button
            key={user._id}
            onClick={() => onSelect(user._id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
          >
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              {user.bio && <p className="text-xs text-white/40 truncate max-w-[200px]">{user.bio}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Main: MessagesPage ─────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function MessagesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((s) => s.auth);
  const conversations = useSelector(selectConversations);
  const activeConversation = useSelector(selectActiveConversation);
  const messages = useSelector(selectMessages);
  const loading = useSelector(selectMessagesLoading);
  const typingUsers = useSelector(selectTypingUsers);

  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat' | 'new'
  const [editingMsg, setEditingMsg] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [images, setImages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const messaging = useMessaging();

  // Fetch conversations on mount
  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select a conversation
  const handleSelectConversation = useCallback((conv) => {
    dispatch(setActiveConversation(conv));
    dispatch(fetchMessages(conv._id));
    dispatch(markConversationRead(conv._id));
    messaging?.joinConversation?.(conv._id);
    setMobileView('chat');
  }, [dispatch, messaging]);

  // Go back to list (mobile)
  const handleBackToList = useCallback(() => {
    dispatch(setActiveConversation(null));
    setMobileView('list');
    setEditingMsg(null);
    setMsgText('');
  }, [dispatch]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!msgText.trim() && images.length === 0) return;
    if (!activeConversation) return;

    if (editingMsg) {
      dispatch(editMessage({ messageId: editingMsg._id, text: msgText }));
      setEditingMsg(null);
    } else {
      const payload = { text: msgText.trim() };
      if (images.length > 0) payload.images = images;
      dispatch(sendMessage({ conversationId: activeConversation._id, ...payload }));
      messaging?.sendMessage?.(activeConversation._id, payload);
    }
    setMsgText('');
    setImages([]);
  }, [dispatch, msgText, images, activeConversation, editingMsg, messaging]);

  // Handle key press in input
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    messaging?.startTyping?.(activeConversation?._id);
  }, [handleSend, messaging, activeConversation]);

  // Edit message
  const handleEdit = useCallback((msg) => {
    setEditingMsg(msg);
    setMsgText(msg.text || '');
  }, []);

  // Delete message
  const handleDelete = useCallback((msgId) => {
    if (!activeConversation) return;
    dispatch(removeMessage({ conversationId: activeConversation._id, messageId: msgId }));
  }, [dispatch, activeConversation]);

  // Reaction
  const handleReaction = useCallback((msgId, emoji) => {
    dispatch(addReaction({ messageId: msgId, emoji }));
  }, [dispatch]);

  // Image upload
  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 4) {
      toast.error('Maximum 4 images');
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
  }, [images]);

  // Start new conversation
  const handleNewConversation = useCallback(async (userId) => {
    try {
      const result = await dispatch(createConversation({ participantId: userId })).unwrap();
      dispatch(fetchConversations());
      handleSelectConversation(result);
    } catch {
      toast.error('Failed to start conversation');
    }
  }, [dispatch, handleSelectConversation]);

  // Typing for this conversation
  const typingInActive = activeConversation
    ? Object.entries(typingUsers)
        .filter(([uid, cid]) => cid === activeConversation._id && uid !== currentUser?._id)
        .length > 0
    : false;

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-4rem)] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="glass w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <IconBack />
        </button>
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <div className="flex-1" />
        <button
          onClick={() => setMobileView('new')}
          className="glass w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors text-white/70"
          title="New conversation"
        >
          <IconPlus />
        </button>
      </div>

      {/* Body — desktop: split, mobile: swap */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Conversation List ──────────────────────────────────── */}
        <div className={`
          w-full sm:w-80 sm:min-w-[320px] sm:border-r border-white/10 flex flex-col
          ${mobileView !== 'list' ? 'hidden sm:flex' : 'flex'}
        `}>
          {mobileView === 'new' && (
            <div className="sm:hidden flex-1">
              <NewConversationView
                currentUserId={currentUser?._id}
                onSelect={handleNewConversation}
                onCancel={() => setMobileView('list')}
              />
            </div>
          )}
          {mobileView !== 'new' && (
            <>
              {loading && conversations.length === 0 ? (
                <div className="flex-1 p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                      <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-2/5 animate-pulse" />
                        <div className="h-2.5 bg-white/10 rounded w-3/5 animate-pulse" />
                      </div>
                      <div className="h-2 bg-white/10 rounded w-8 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-3">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-white/40">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-sm">No conversations yet</p>
                  <button
                    onClick={() => setMobileView('new')}
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Start a conversation
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {conversations.map((conv) => (
                    <ConversationItem
                      key={conv._id}
                      conv={conv}
                      currentUserId={currentUser?._id}
                      isActive={activeConversation?._id === conv._id}
                      onClick={() => handleSelectConversation(conv)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Desktop new conversation button */}
          <div className="hidden sm:block p-3 border-t border-white/10">
            <NewConversationView
              currentUserId={currentUser?._id}
              onSelect={handleNewConversation}
              onCancel={() => {}}
            />
          </div>
        </div>

        {/* ─── Chat Area ─────────────────────────────────────────── */}
        <div className={`
          flex-1 flex flex-col
          ${mobileView !== 'chat' ? 'hidden sm:flex' : 'flex'}
        `}>
          {!activeConversation ? (
            <EmptyChat />
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button
                  onClick={handleBackToList}
                  className="sm:hidden glass w-8 h-8 rounded-lg flex items-center justify-center"
                >
                  <IconBack />
                </button>
                {(() => {
                  const other = activeConversation.participants?.find((p) => p._id !== currentUser?._id) || activeConversation.participants?.[0];
                  return (
                    <div className="flex items-center gap-3">
                      {other?.avatar ? (
                        <img src={other.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {other?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{other?.name || 'Unknown'}</p>
                        {typingInActive && <p className="text-[11px] text-blue-400">typing...</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-3">
                {messages.map((msg, i) => (
                  <div key={msg._id}>
                    {shouldShowDateSep(messages, i) && <DateSeparator date={msg.createdAt} />}
                    <MessageBubble
                      msg={msg}
                      isOwn={msg.sender === currentUser?._id || msg.sender?._id === currentUser?._id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReaction={handleReaction}
                    />
                  </div>
                ))}
                {typingInActive && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Edit indicator */}
              {editingMsg && (
                <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between bg-blue-500/10">
                  <span className="text-xs text-blue-400">Editing message</span>
                  <button onClick={() => { setEditingMsg(null); setMsgText(''); }} className="text-xs text-white/40 hover:text-white">Cancel</button>
                </div>
              )}

              {/* Image preview */}
              {images.length > 0 && (
                <div className="px-4 py-2 border-t border-white/10 flex gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div className="p-3 border-t border-white/10">
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white/80 shrink-0"
                  >
                    <IconImage />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 glass rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none max-h-24"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!msgText.trim() && images.length === 0}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white shrink-0 transition-colors"
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
