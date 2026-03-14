import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { eventApi } from '../../api/eventApi';

// --- Entity Adapter (O(1) lookups by _id) ---
const eventsAdapter = createEntityAdapter({ selectId: (event) => event._id });

// --- Async Thunks ---
let viewportAbort = null;
export const fetchViewportEvents = createAsyncThunk(
  'events/fetchViewport',
  async (bounds, { rejectWithValue, signal }) => {
    try {
      if (viewportAbort) viewportAbort.abort();
      const controller = new AbortController();
      viewportAbort = controller;
      signal.addEventListener('abort', () => controller.abort());
      const res = await eventApi.getViewportEvents(bounds, { signal: controller.signal });
      return res.data;
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return rejectWithValue({ canceled: true });
      return rejectWithValue(err.response?.data);
    }
  }
);

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

// --- Slice ---
const eventSlice = createSlice({
  name: 'events',
  initialState: eventsAdapter.getInitialState({
    selectedEvent: null,
    searchResults: [],
    loading: false,
    error: null,
  }),
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
      if (Array.isArray(items)) eventsAdapter.setAll(state, items);
    });
    builder.addCase(fetchViewportEvents.rejected, (state, action) => {
      if (action.payload?.canceled) return;
      state.loading = false;
      state.error = action.payload?.message;
    });
    builder.addCase(fetchEvent.fulfilled, (state, action) => {
      state.selectedEvent = action.payload.event || action.payload;
    });
    builder.addCase(createEvent.fulfilled, (state, action) => {
      const event = action.payload.event || action.payload;
      eventsAdapter.addOne(state, event);
    });
    builder.addCase(toggleRsvp.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      eventsAdapter.upsertOne(state, updated);
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });
    builder.addCase(searchEvents.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.events || action.payload;
      state.searchResults = Array.isArray(items) ? items : [];
    });
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      eventsAdapter.removeOne(state, action.payload.id);
      if (state.selectedEvent?._id === action.payload.id) state.selectedEvent = null;
    });
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      eventsAdapter.upsertOne(state, updated);
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });
  },
});

export const { setSelectedEvent, clearSelectedEvent, clearEventSearch } = eventSlice.actions;

// --- Memoized Selectors ---
const adapterSelectors = eventsAdapter.getSelectors((state) => state.events);

export const selectAllEvents = adapterSelectors.selectAll;
export const selectEventById = adapterSelectors.selectById;
export const selectEventIds = adapterSelectors.selectIds;
export const selectEventsLoading = (state) => state.events.loading;
export const selectEventsError = (state) => state.events.error;
export const selectSelectedEvent = (state) => state.events.selectedEvent;
export const selectEventSearchResults = (state) => state.events.searchResults;

export const selectUpcomingEvents = createSelector(
  [selectAllEvents],
  (events) => events.filter((e) => new Date(e.date || e.startDate) >= new Date())
);

export default eventSlice.reducer;
