import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { messageApi } from '../../api/messageApi';

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

export const sendMessage = createAsyncThunk('messages/send', async (data, { rejectWithValue }) => {
  try { const res = await messageApi.sendMessage(data); return res.data; }
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
      // Increment unread count for incoming messages (not from current user in active chat)
      // This is handled more precisely via fetchUnreadCount after socket events
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
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConversations.fulfilled, (state, action) => { state.conversations = action.payload.conversations || action.payload; });
    builder.addCase(createConversation.fulfilled, (state, action) => {
      const conv = action.payload;
      const exists = state.conversations.some(c => c._id === conv._id);
      if (!exists) state.conversations.unshift(conv);
    });
    builder.addCase(fetchMessages.pending, (state) => { state.loading = true; });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false; state.messages = action.payload.messages || action.payload;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const msg = action.payload.message || action.payload;
      state.messages.push(msg);
    });
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload.unreadCount ?? 0;
    });
  },
});

export const { setActiveConversation, addMessage, setTyping, incrementUnread } = messageSlice.actions;
export default messageSlice.reducer;
