import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../api/userApi';

export const fetchUserProfile = createAsyncThunk('users/fetchProfile', async (id, { rejectWithValue }) => {
  try { const res = await userApi.getProfile(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const toggleFollow = createAsyncThunk('users/toggleFollow', async ({ id, isCurrentlyFollowing }, { rejectWithValue }) => {
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
    hydrateProfile: (state, action) => {
      if (action.payload) { state.profile = action.payload; }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUserProfile.pending, (state) => { state.loading = true; });
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => { state.loading = false; state.profile = action.payload.user || action.payload; });
    builder.addCase(fetchUserProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    builder.addCase(toggleFollow.pending, (state, action) => {
      const { id, isCurrentlyFollowing } = action.meta.arg;
      if (state.profile && state.profile._id === id) {
        const count = state.profile.followersCount ?? state.profile.followers?.length ?? 0;
        state.profile.followersCount = isCurrentlyFollowing ? count - 1 : count + 1;
        state.profile._optimisticFollow = !isCurrentlyFollowing;
      }
    });
    builder.addCase(toggleFollow.fulfilled, (state, action) => {
      if (state.profile) {
        const updated = action.payload.user || action.payload;
        delete updated._optimisticFollow;
        state.profile = updated;
      }
    });
    builder.addCase(toggleFollow.rejected, (state, action) => {
      const { id, isCurrentlyFollowing } = action.meta.arg;
      if (state.profile && state.profile._id === id) {
        const count = state.profile.followersCount ?? state.profile.followers?.length ?? 0;
        state.profile.followersCount = isCurrentlyFollowing ? count + 1 : count - 1;
        delete state.profile._optimisticFollow;
      }
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

export const { clearProfile, clearSearch, hydrateProfile } = userSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────
export const selectUserProfile = (state) => state.users.profile;
export const selectUserLoading = (state) => state.users.loading;
export const selectUserError = (state) => state.users.error;
export const selectNearbyUsers = (state) => state.users.nearbyUsers;
export const selectUserSearchResults = (state) => state.users.searchResults;

export default userSlice.reducer;
