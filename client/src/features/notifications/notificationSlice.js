import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api/axios';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_, { rejectWithValue }) => {
  try { const res = await API.get('/users/notifications'); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const markAsRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try { const res = await API.put(`/users/notifications/${id}/read`); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    clearNotifications: (state) => { state.items = []; state.unreadCount = 0; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      state.items = action.payload.notifications || action.payload;
      state.unreadCount = state.items.filter(n => !n.read).length;
    });
    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const id = action.payload.notification?._id || action.meta.arg;
      const item = state.items.find(n => n._id === id);
      if (item && !item.read) { item.read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    });
  },
});

export const { addNotification, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
