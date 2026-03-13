import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pinApi } from '../../api/pinApi';

export const fetchViewportPins = createAsyncThunk('pins/fetchViewport', async (bounds, { rejectWithValue }) => {
  try { const res = await pinApi.getViewportPins(bounds); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

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

const pinSlice = createSlice({
  name: 'pins',
  initialState: {
    pins: [],
    selectedPin: null,
    searchResults: [],
    loading: false,
    error: null,
    filters: { category: 'all', radius: 5000 },
  },
  reducers: {
    setSelectedPin: (state, action) => { state.selectedPin = action.payload; },
    clearSelectedPin: (state) => { state.selectedPin = null; },
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    clearPinSearch: (state) => { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchViewportPins.pending, (state) => { state.loading = true; });
    builder.addCase(fetchViewportPins.fulfilled, (state, action) => { state.loading = false; state.pins = action.payload.pins || action.payload; });
    builder.addCase(fetchViewportPins.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    builder.addCase(fetchPin.fulfilled, (state, action) => { state.selectedPin = action.payload.pin || action.payload; });
    builder.addCase(createPin.fulfilled, (state, action) => { state.pins.push(action.payload.pin || action.payload); });
    builder.addCase(updatePin.fulfilled, (state, action) => {
      const updated = action.payload.pin || action.payload;
      const idx = state.pins.findIndex(p => p._id === updated._id);
      if (idx !== -1) state.pins[idx] = updated;
      if (state.selectedPin?._id === updated._id) state.selectedPin = updated;
    });
    builder.addCase(deletePin.fulfilled, (state, action) => { state.pins = state.pins.filter(p => p._id !== action.payload); });
    builder.addCase(togglePinLike.fulfilled, (state, action) => {
      const updated = action.payload.pin || action.payload;
      const idx = state.pins.findIndex(p => p._id === updated._id);
      if (idx !== -1) state.pins[idx] = updated;
      if (state.selectedPin?._id === updated._id) state.selectedPin = updated;
    });
    builder.addCase(searchPins.fulfilled, (state, action) => { state.searchResults = action.payload.pins || action.payload; });
  },
});

export const { setSelectedPin, clearSelectedPin, setFilters, clearPinSearch } = pinSlice.actions;
export default pinSlice.reducer;
