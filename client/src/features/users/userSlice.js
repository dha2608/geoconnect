import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../api/userApi';

export const fetchUserProfile = createAsyncThunk('users/fetchProfile', async (id, { rejectWithValue }) => {
  try { const res = await userApi.getProfile(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const toggleFollow = createAsyncThunk('users/toggleFollow', async (id, { rejectWithValue }) => {
  try { const res = await userApi.toggleFollow(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchNearbyUsers = createAsyncThunk('users/fetchNearby', async (params, { rejectWithValue }) => {
  try { const res = await userApi.getNearbyUsers(params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const searchUsers = createAsyncThunk('users/search', async (query, { rejectWithValue }) => {
  try { const res = await userApi.searchUsers(query); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const userSlice = createSlice({
  name: 'users',
  initialState: { profile: null, nearbyUsers: [], searchResults: [], loading: false, error: null },
  reducers: {
    clearProfile: (state) => { state.profile = null; },
    clearSearch: (state) => { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserProfile.pending, (state) => { state.loading = true; });
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => { state.loading = false; state.profile = action.payload.user || action.payload; });
    builder.addCase(fetchUserProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    builder.addCase(toggleFollow.fulfilled, (state, action) => {
      if (state.profile) state.profile = action.payload.user || action.payload;
    });
    builder.addCase(fetchNearbyUsers.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.users || action.payload;
      state.nearbyUsers = Array.isArray(items) ? items : [];
    });
    builder.addCase(searchUsers.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload.users || action.payload;
      state.searchResults = Array.isArray(items) ? items : [];
    });
  },
});

export const { clearProfile, clearSearch } = userSlice.actions;
export default userSlice.reducer;
