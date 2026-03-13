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

export const markAllAsRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try { const res = await API.put('/users/notifications/read-all'); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteNotification = createAsyncThunk('notifications/delete', async (id, { rejectWithValue }) => {
  try { await API.delete(`/users/notifications/${id}`); return { id }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const clearAllNotifications = createAsyncThunk('notifications/clearAll', async (_, { rejectWithValue }) => {
  try { await API.delete('/users/notifications/clear'); return {}; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false, latestNotification: null },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    clearNotifications: (state) => { state.items = []; state.unreadCount = 0; },
    setLatestNotification: (state, action) => {
      state.latestNotification = action.payload;
    },
    clearLatestNotification: (state) => {
      state.latestNotification = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.notifications || action.payload;
      state.items = Array.isArray(items) ? items : [];
      state.unreadCount = state.items.filter(n => !n.read).length;
    });
    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const id = action.payload.notification?._id || action.meta.arg;
      const item = state.items.find(n => n._id === id);
      if (item && !item.read) { item.read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    });
    builder.addCase(markAllAsRead.fulfilled, (state) => {
      state.items.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    });
    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      const idx = state.items.findIndex(n => n._id === action.payload.id);
      if (idx !== -1) {
        if (!state.items[idx].read) state.unreadCount = Math.max(0, state.unreadCount - 1);
        state.items.splice(idx, 1);
      }
    });
    builder.addCase(clearAllNotifications.fulfilled, (state) => {
      state.items = [];
      state.unreadCount = 0;
    });
  },
});

export const {
  addNotification,
  clearNotifications,
  setLatestNotification,
  clearLatestNotification,
} = notificationSlice.actions;
export default notificationSlice.reducer;
