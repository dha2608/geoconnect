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

export const toggleRsvp = createAsyncThunk('events/toggleRsvp', async ({ id, userId }, { rejectWithValue }) => {
  try { const res = await eventApi.toggleRsvp(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const cancelRsvp = createAsyncThunk('events/cancelRsvp', async (id, { rejectWithValue }) => {
  try { const res = await eventApi.cancelRsvp(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const searchEvents = createAsyncThunk('events/search', async (params, { rejectWithValue }) => {
  try { const res = await eventApi.searchEvents(params); return res.data; }
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

// --- Recurring ---
export const fetchRecurringInstances = createAsyncThunk('events/fetchRecurring', async ({ id, params }, { rejectWithValue }) => {
  try { const res = await eventApi.getRecurringInstances(id, params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Tags ---
export const fetchPopularTags = createAsyncThunk('events/fetchPopularTags', async (_, { rejectWithValue }) => {
  try { const res = await eventApi.getPopularTags(); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchEventsByTag = createAsyncThunk('events/fetchByTag', async ({ tag, params }, { rejectWithValue }) => {
  try { const res = await eventApi.getEventsByTag(tag, params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Comments ---
export const fetchEventComments = createAsyncThunk('events/fetchComments', async ({ eventId, params }, { rejectWithValue }) => {
  try { const res = await eventApi.getEventComments(eventId, params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const addEventComment = createAsyncThunk('events/addComment', async ({ eventId, text }, { rejectWithValue }) => {
  try { const res = await eventApi.addEventComment(eventId, { text }); return { eventId, comment: res.data.comment || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const editEventComment = createAsyncThunk('events/editComment', async ({ eventId, commentId, text }, { rejectWithValue }) => {
  try { const res = await eventApi.editEventComment(eventId, commentId, { text }); return { eventId, comment: res.data.comment || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteEventComment = createAsyncThunk('events/deleteComment', async ({ eventId, commentId }, { rejectWithValue }) => {
  try { await eventApi.deleteEventComment(eventId, commentId); return { eventId, commentId }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const likeEventComment = createAsyncThunk('events/likeComment', async ({ eventId, commentId }, { rejectWithValue }) => {
  try { const res = await eventApi.likeEventComment(eventId, commentId); return { eventId, comment: res.data.comment || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const unlikeEventComment = createAsyncThunk('events/unlikeComment', async ({ eventId, commentId }, { rejectWithValue }) => {
  try { const res = await eventApi.unlikeEventComment(eventId, commentId); return { eventId, comment: res.data.comment || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Slice ---
const eventSlice = createSlice({
  name: 'events',
  initialState: eventsAdapter.getInitialState({
    selectedEvent: null,
    searchResults: [],
    eventComments: [],
    commentsLoading: false,
    recurringInstances: [],
    popularTags: [],
    tagEvents: [],
    loading: false,
    error: null,
  }),
  reducers: {
    setSelectedEvent: (state, action) => { state.selectedEvent = action.payload; },
    clearSelectedEvent: (state) => { state.selectedEvent = null; state.eventComments = []; },
    clearEventSearch: (state) => { state.searchResults = []; },
    clearEventComments: (state) => { state.eventComments = []; },
  },
  extraReducers: (builder) => {
    // Viewport
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

    // Single event
    builder.addCase(fetchEvent.fulfilled, (state, action) => {
      state.selectedEvent = action.payload.event || action.payload;
    });

    // Create
    builder.addCase(createEvent.fulfilled, (state, action) => {
      const event = action.payload.event || action.payload;
      eventsAdapter.addOne(state, event);
    });

    // RSVP
    builder.addCase(toggleRsvp.pending, (state, action) => {
      const { id, userId } = action.meta.arg;
      const toggle = (evt) => {
        if (!evt) return;
        const att = evt.attendees || [];
        const attending = att.some((a) => (a._id ?? a) === userId);
        evt.attendees = attending ? att.filter((a) => (a._id ?? a) !== userId) : [...att, userId];
      };
      toggle(state.entities[id]);
      if (state.selectedEvent?._id === id) toggle(state.selectedEvent);
    });
    builder.addCase(toggleRsvp.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      eventsAdapter.upsertOne(state, updated);
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });
    builder.addCase(toggleRsvp.rejected, (state, action) => {
      const { id, userId } = action.meta.arg;
      const toggle = (evt) => {
        if (!evt) return;
        const att = evt.attendees || [];
        const attending = att.some((a) => (a._id ?? a) === userId);
        evt.attendees = attending ? att.filter((a) => (a._id ?? a) !== userId) : [...att, userId];
      };
      toggle(state.entities[id]);
      if (state.selectedEvent?._id === id) toggle(state.selectedEvent);
    });
    builder.addCase(cancelRsvp.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      eventsAdapter.upsertOne(state, updated);
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });

    // Search
    builder.addCase(searchEvents.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.events || action.payload;
      state.searchResults = Array.isArray(items) ? items : [];
    });

    // Delete
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      eventsAdapter.removeOne(state, action.payload.id);
      if (state.selectedEvent?._id === action.payload.id) state.selectedEvent = null;
    });

    // Update
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const updated = action.payload.event || action.payload;
      eventsAdapter.upsertOne(state, updated);
      if (state.selectedEvent?._id === updated._id) state.selectedEvent = updated;
    });

    // Recurring
    builder.addCase(fetchRecurringInstances.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.events || action.payload;
      state.recurringInstances = Array.isArray(items) ? items : [];
    });

    // Tags
    builder.addCase(fetchPopularTags.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.tags || action.payload;
      state.popularTags = Array.isArray(items) ? items : [];
    });
    builder.addCase(fetchEventsByTag.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.events || action.payload;
      state.tagEvents = Array.isArray(items) ? items : [];
    });

    // Comments
    builder.addCase(fetchEventComments.pending, (state) => { state.commentsLoading = true; });
    builder.addCase(fetchEventComments.fulfilled, (state, action) => {
      state.commentsLoading = false;
      const items = action.payload.data || action.payload.comments || action.payload;
      state.eventComments = Array.isArray(items) ? items : [];
    });
    builder.addCase(fetchEventComments.rejected, (state) => { state.commentsLoading = false; });
    builder.addCase(addEventComment.fulfilled, (state, action) => {
      state.eventComments.push(action.payload.comment);
      if (state.selectedEvent) {
        state.selectedEvent.commentCount = (state.selectedEvent.commentCount || 0) + 1;
      }
    });
    builder.addCase(editEventComment.fulfilled, (state, action) => {
      const idx = state.eventComments.findIndex((c) => c._id === action.payload.comment._id);
      if (idx !== -1) state.eventComments[idx] = action.payload.comment;
    });
    builder.addCase(deleteEventComment.fulfilled, (state, action) => {
      state.eventComments = state.eventComments.filter((c) => c._id !== action.payload.commentId);
      if (state.selectedEvent) {
        state.selectedEvent.commentCount = Math.max(0, (state.selectedEvent.commentCount || 0) - 1);
      }
    });
    builder.addCase(likeEventComment.fulfilled, (state, action) => {
      const idx = state.eventComments.findIndex((c) => c._id === action.payload.comment._id);
      if (idx !== -1) state.eventComments[idx] = action.payload.comment;
    });
    builder.addCase(unlikeEventComment.fulfilled, (state, action) => {
      const idx = state.eventComments.findIndex((c) => c._id === action.payload.comment._id);
      if (idx !== -1) state.eventComments[idx] = action.payload.comment;
    });
  },
});

export const { setSelectedEvent, clearSelectedEvent, clearEventSearch, clearEventComments } = eventSlice.actions;

// --- Memoized Selectors ---
const adapterSelectors = eventsAdapter.getSelectors((state) => state.events);

export const selectAllEvents = adapterSelectors.selectAll;
export const selectEventById = adapterSelectors.selectById;
export const selectEventIds = adapterSelectors.selectIds;
export const selectEventsLoading = (state) => state.events.loading;
export const selectEventsError = (state) => state.events.error;
export const selectSelectedEvent = (state) => state.events.selectedEvent;
export const selectEventSearchResults = (state) => state.events.searchResults;
export const selectEventComments = (state) => state.events.eventComments;
export const selectCommentsLoading = (state) => state.events.commentsLoading;
export const selectRecurringInstances = (state) => state.events.recurringInstances;
export const selectPopularTags = (state) => state.events.popularTags;
export const selectTagEvents = (state) => state.events.tagEvents;

export const selectUpcomingEvents = createSelector(
  [selectAllEvents],
  (events) => events.filter((e) => new Date(e.startTime) >= new Date())
);

export default eventSlice.reducer;
