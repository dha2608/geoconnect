import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postApi } from '../../api/postApi';

export const fetchFeed = createAsyncThunk('posts/fetchFeed', async (params, { rejectWithValue }) => {
  try { const res = await postApi.getFeed(params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const createPost = createAsyncThunk('posts/create', async (data, { rejectWithValue }) => {
  try { const res = await postApi.createPost(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const updatePost = createAsyncThunk('posts/update', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await postApi.updatePost(id, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const togglePostLike = createAsyncThunk('posts/toggleLike', async (id, { rejectWithValue }) => {
  try { const res = await postApi.toggleLike(id); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const addComment = createAsyncThunk('posts/addComment', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await postApi.addComment(id, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

const postSlice = createSlice({
  name: 'posts',
  initialState: { posts: [], loading: false, error: null, hasMore: true, page: 1 },
  reducers: {
    clearPosts: (state) => { state.posts = []; state.page = 1; state.hasMore = true; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFeed.pending, (state) => { state.loading = true; });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      state.loading = false;
      const newPosts = action.payload.posts || action.payload;
      state.posts = state.page === 1 ? newPosts : [...state.posts, ...newPosts];
      state.hasMore = newPosts.length >= 20;
      state.page += 1;
    });
    builder.addCase(fetchFeed.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    builder.addCase(createPost.fulfilled, (state, action) => { state.posts.unshift(action.payload.post || action.payload); });
    builder.addCase(updatePost.fulfilled, (state, action) => {
      const updated = action.payload.post || action.payload;
      const idx = state.posts.findIndex(p => p._id === updated._id);
      if (idx !== -1) state.posts[idx] = updated;
    });
    builder.addCase(togglePostLike.fulfilled, (state, action) => {
      const updated = action.payload.post || action.payload;
      const idx = state.posts.findIndex(p => p._id === updated._id);
      if (idx !== -1) state.posts[idx] = updated;
    });
  },
});

export const { clearPosts } = postSlice.actions;
export default postSlice.reducer;
