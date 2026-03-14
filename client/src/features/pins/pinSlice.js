import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { pinApi } from '../../api/pinApi';

// --- Entity Adapter (O(1) lookups by _id) ---
const pinsAdapter = createEntityAdapter({ selectId: (pin) => pin._id });

// --- Async Thunks ---
let viewportAbort = null;
export const fetchViewportPins = createAsyncThunk(
  'pins/fetchViewport',
  async (bounds, { rejectWithValue, signal }) => {
    try {
      if (viewportAbort) viewportAbort.abort();
      const controller = new AbortController();
      viewportAbort = controller;
      signal.addEventListener('abort', () => controller.abort());
      const res = await pinApi.getViewportPins(bounds, { signal: controller.signal });
      return res.data;
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return rejectWithValue({ canceled: true });
      return rejectWithValue(err.response?.data);
    }
  }
);

export const fetchPin = createAsyncThunk('pins/fetchOne', async (id, { rejectWithValue }) => {
  try { const res = await pinApi.getPin(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const createPin = createAsyncThunk('pins/create', async (data, { rejectWithValue }) => {
  try { const res = await pinApi.createPin(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updatePin = createAsyncThunk('pins/update', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await pinApi.updatePin(id, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deletePin = createAsyncThunk('pins/delete', async (id, { rejectWithValue }) => {
  try { await pinApi.deletePin(id); return id; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const togglePinLike = createAsyncThunk('pins/toggleLike', async (id, { rejectWithValue }) => {
  try { const res = await pinApi.toggleLike(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const togglePinSave = createAsyncThunk('pins/toggleSave', async (id, { rejectWithValue }) => {
  try { const res = await pinApi.toggleSave(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const searchPins = createAsyncThunk('pins/search', async (query, { rejectWithValue }) => {
  try { const res = await pinApi.searchPins(query); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const checkInPin = createAsyncThunk('pins/checkIn', async ({ id, undo }, { rejectWithValue }) => {
  try {
    const res = undo ? await pinApi.undoCheckIn(id) : await pinApi.checkIn(id);
    return { pinId: id, ...res.data };
  } catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Slice ---
const pinSlice = createSlice({
  name: 'pins',
  initialState: pinsAdapter.getInitialState({
    selectedPin: null,
    searchResults: [],
    loading: false,
    error: null,
    filters: { category: 'all', radius: 5000 },
  }),
  reducers: {
    setSelectedPin: (state, action) => { state.selectedPin = action.payload; },
    clearSelectedPin: (state) => { state.selectedPin = null; },
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    clearPinSearch: (state) => { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchViewportPins.pending, (state) => { state.loading = true; });
    builder.addCase(fetchViewportPins.fulfilled, (state, action) => {
      state.loading = false;
      const items = action.payload.data || action.payload.pins || action.payload;
      if (Array.isArray(items)) pinsAdapter.setAll(state, items);
    });
    builder.addCase(fetchViewportPins.rejected, (state, action) => {
      if (action.payload?.canceled) return;
      state.loading = false;
      state.error = action.payload?.message;
    });
    builder.addCase(fetchPin.fulfilled, (state, action) => {
      state.selectedPin = action.payload.pin || action.payload;
    });
    builder.addCase(createPin.fulfilled, (state, action) => {
      const pin = action.payload.pin || action.payload;
      pinsAdapter.addOne(state, pin);
    });
    builder.addCase(updatePin.fulfilled, (state, action) => {
      const updated = action.payload.pin || action.payload;
      pinsAdapter.upsertOne(state, updated);
      if (state.selectedPin?._id === updated._id) state.selectedPin = updated;
    });
    builder.addCase(deletePin.fulfilled, (state, action) => {
      pinsAdapter.removeOne(state, action.payload);
    });
    builder.addCase(togglePinLike.fulfilled, (state, action) => {
      const updated = action.payload.pin || action.payload;
      pinsAdapter.upsertOne(state, updated);
      if (state.selectedPin?._id === updated._id) state.selectedPin = updated;
    });
    builder.addCase(searchPins.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.pins || action.payload;
      state.searchResults = Array.isArray(items) ? items : [];
    });
    builder.addCase(checkInPin.fulfilled, (state, action) => {
      const { pinId, checkIns, checkInCount } = action.payload;
      if (state.selectedPin?._id === pinId) {
        state.selectedPin.checkIns = checkIns;
        state.selectedPin.checkInCount = checkInCount;
      }
      const existing = state.entities[pinId];
      if (existing) {
        existing.checkIns = checkIns;
        existing.checkInCount = checkInCount;
      }
    });
  },
});

export const { setSelectedPin, clearSelectedPin, setFilters, clearPinSearch } = pinSlice.actions;

// --- Memoized Selectors ---
const adapterSelectors = pinsAdapter.getSelectors((state) => state.pins);

export const selectAllPins = adapterSelectors.selectAll;
export const selectPinById = adapterSelectors.selectById;
export const selectPinIds = adapterSelectors.selectIds;
export const selectPinsLoading = (state) => state.pins.loading;
export const selectPinsError = (state) => state.pins.error;
export const selectSelectedPin = (state) => state.pins.selectedPin;
export const selectPinFilters = (state) => state.pins.filters;
export const selectPinSearchResults = (state) => state.pins.searchResults;
export const selectPinFilterCategory = (state) => state.pins.filters.category;

export const selectFilteredPins = createSelector(
  [selectAllPins, selectPinFilterCategory],
  (pins, category) => category === 'all' ? pins : pins.filter((p) => p.category === category)
);

export default pinSlice.reducer;
