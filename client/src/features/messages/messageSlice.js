import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as messageApi from '../../api/messageApi';

export const fetchConversations = createAsyncThunk('messages/fetchConversations', async (_, { rejectWithValue }) => {
  try { const res = await messageApi.getConversations(); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const createConversation = createAsyncThunk('messages/createConversation', async (recipientId, { rejectWithValue }) => {
  try { const res = await messageApi.createConversation(recipientId); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchMessages = createAsyncThunk('messages/fetchMessages', async ({ conversationId, params }, { rejectWithValue }) => {
  try { const res = await messageApi.getMessages(conversationId, params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const sendMessage = createAsyncThunk('messages/send', async ({ conversationId, data }, { rejectWithValue }) => {
  try { const res = await messageApi.sendMessage(conversationId, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchUnreadCount = createAsyncThunk('messages/fetchUnreadCount', async (_, { rejectWithValue }) => {
  try { const res = await messageApi.getUnreadCount(); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const markConversationRead = createAsyncThunk('messages/markRead', async (conversationId, { rejectWithValue }) => {
  try { const res = await messageApi.markConversationRead(conversationId); return { conversationId, ...res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// ─── New thunks ───────────────────────────────────────────────────────────────

export const editMessage = createAsyncThunk('messages/editMessage', async ({ messageId, text }, { rejectWithValue }) => {
  try { const res = await messageApi.editMessage(messageId, { text }); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const addReaction = createAsyncThunk('messages/addReaction', async ({ messageId, emoji }, { rejectWithValue }) => {
  try { const res = await messageApi.addReaction(messageId, emoji); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const removeReaction = createAsyncThunk('messages/removeReaction', async (messageId, { rejectWithValue }) => {
  try { const res = await messageApi.removeReaction(messageId); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const messageSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: [],
    activeConversation: null,
    messages: [],
    loading: false,
    typingUsers: {},
    unreadCount: 0,
  },
  reducers: {
    setActiveConversation: (state, action) => { state.activeConversation = action.payload; },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action) => {
      const updated = action.payload;
      const idx = state.messages.findIndex((m) => m._id === updated._id);
      if (idx !== -1) state.messages[idx] = updated;
    },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = [];
      if (isTyping && !state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      } else if (!isTyping) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(id => id !== userId);
      }
    },
    incrementUnread: (state) => { state.unreadCount += 1; },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },
    hydrateConversations: (state, action) => {
      if (Array.isArray(action.payload) && action.payload.length > 0) {
        state.conversations = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.conversations || action.payload;
      state.conversations = Array.isArray(items) ? items : [];
    });
    builder.addCase(createConversation.fulfilled, (state, action) => {
      const conv = action.payload;
      const exists = state.conversations.some(c => c._id === conv._id);
      if (!exists) state.conversations.unshift(conv);
    });
    builder.addCase(fetchMessages.pending, (state) => { state.loading = true; });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false;
      const items = action.payload.data || action.payload.messages || action.payload;
      state.messages = Array.isArray(items) ? items : [];
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const msg = action.payload.data || action.payload.message || action.payload;
      state.messages.push(msg);
    });
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload.unreadCount ?? action.payload.data?.unreadCount ?? 0;
    });
    // Edit message
    builder.addCase(editMessage.fulfilled, (state, action) => {
      const updated = action.payload.data || action.payload;
      const idx = state.messages.findIndex((m) => m._id === updated._id);
      if (idx !== -1) state.messages[idx] = updated;
    });
    // Add reaction
    builder.addCase(addReaction.fulfilled, (state, action) => {
      const updated = action.payload.data || action.payload;
      const idx = state.messages.findIndex((m) => m._id === updated._id);
      if (idx !== -1) state.messages[idx] = updated;
    });
    // Remove reaction
    builder.addCase(removeReaction.fulfilled, (state, action) => {
      const updated = action.payload.data || action.payload;
      const idx = state.messages.findIndex((m) => m._id === updated._id);
      if (idx !== -1) state.messages[idx] = updated;
    });
  },
});

export const { setActiveConversation, addMessage, updateMessage, setTyping, incrementUnread, removeMessage, hydrateConversations } = messageSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────
export const selectConversations = (state) => state.messages.conversations;
export const selectActiveConversation = (state) => state.messages.activeConversation;
export const selectMessages = (state) => state.messages.messages;
export const selectMessagesLoading = (state) => state.messages.loading;
export const selectTypingUsers = (state) => state.messages.typingUsers;
export const selectUnreadCount = (state) => state.messages.unreadCount;

export default messageSlice.reducer;
