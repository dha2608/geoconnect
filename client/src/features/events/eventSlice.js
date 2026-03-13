import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eventApi } from '../../api/eventApi';

export const fetchViewportEvents = createAsyncThunk('events/fetchViewport', async (bounds, { rejectWithValue }) => {
  try { const res = await eventApi.getViewportEvents(bounds); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchEvent = createAsyncThunk('events/fetchOne', async (id, { rejectWithValue }) => {
  try { const res = await eventApi.getEvent(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const createEvent = createAsyncThunk('events/create', async (data, { rejectWithValue }) => {
  try { const res = await eventApi.createEvent(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const toggleRsvp = createAsyncThunk('events/toggleRsvp', async (id, { rejectWithValue }) => {
  try { const res = await eventApi.toggleRsvp(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const searchEvents = createAsyncThunk('events/search', async (query, { rejectWithValue }) => {
  try { const res = await eventApi.searchEvents(query); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteEvent = createAsyncThunk('events/delete', async (id, { rejectWithValue }) => {
  try { await eventApi.deleteEvent(id); return { id }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updateEvent = createAsyncThunk('events/update', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await eventApi.updateEvent(id, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const eventSlice = createSlice({
  name: 'events',
  initialState: { events: [], selectedEvent: null, searchResults: [], loading: false, error: null },
  reducers: {
    setSelectedEvent: (state, action) => { state.selectedEvent = action.payload; },
    clearSelectedEvent: (state) => { state.selectedEvent = null; },
    clearEventSearch: (state) => { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchViewportEvents.pending, (state) => { state.loading = true; });
    builder.addCase(fetchViewportEvents.fulfilled, (state, action) => {
      state.loading = false;
      const items = action.payload.data || action.payload.events || action.payload;
      state.events = Array.isArray(items) ? items : [];
    });
    builder.addCase(fetchViewportEvents.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    builder.addCase(fetchEvent.fulfilled, (state, action) => { state.selectedEvent = action.payload.event || action.payload; });
    builder.addCase(createEvent.fulfilled, (state, action) => { state.events.push(action.payload.event || action.payload); });
    builder.addCase(toggleRsvp.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      const idx = state.events.findIndex(e => e._id === updated._id);
      if (idx !== -1) state.events[idx] = updated;
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });
    builder.addCase(searchEvents.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.events || action.payload;
      state.searchResults = Array.isArray(items) ? items : [];
    });
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.events = state.events.filter(e => e._id !== action.payload.id);
      if (state.selectedEvent?._id === action.payload.id) state.selectedEvent = null;
    });
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      const idx = state.events.findIndex(e => e._id === updated._id);
      if (idx !== -1) state.events[idx] = updated;
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });
  },
});

export const { setSelectedEvent, clearSelectedEvent, clearEventSearch } = eventSlice.actions;
export default eventSlice.reducer;
