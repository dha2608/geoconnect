import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { messageApi } from '../../api/messageApi';

export const fetchConversations = createAsyncThunk('messages/fetchConversations', async (_, { rejectWithValue }) => {
  try { const res = await messageApi.getConversations(); return res.data; }
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

const messageSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: [],
    activeConversation: null,
    messages: [],
    loading: false,
    typingUsers: {},
  },
  reducers: {
    setActiveConversation: (state, action) => { state.activeConversation = action.payload; },
    addMessage: (state, action) => { state.messages.push(action.payload); },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = [];
      if (isTyping && !state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      } else if (!isTyping) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(id => id !== userId);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConversations.fulfilled, (state, action) => { state.conversations = action.payload.conversations || action.payload; });
    builder.addCase(fetchMessages.pending, (state) => { state.loading = true; });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false; state.messages = action.payload.messages || action.payload;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const msg = action.payload.message || action.payload;
      state.messages.push(msg);
    });
  },
});

export const { setActiveConversation, addMessage, setTyping } = messageSlice.actions;
export default messageSlice.reducer;
