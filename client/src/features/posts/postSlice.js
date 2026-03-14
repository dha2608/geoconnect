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

export const deleteComment = createAsyncThunk('posts/deleteComment', async ({ postId, commentId }, { rejectWithValue }) => {
  try { await postApi.deleteComment(postId, commentId); return { postId, commentId }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deletePost = createAsyncThunk('posts/delete', async (id, { rejectWithValue }) => {
  try { await postApi.deletePost(id); return { id }; }
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
      const items = action.payload.data || action.payload.posts || action.payload;
      const newPosts = Array.isArray(items) ? items : [];
      const pagination = action.payload.pagination;
      state.posts = state.page === 1 ? newPosts : [...state.posts, ...newPosts];
      state.hasMore = pagination ? pagination.page < pagination.pages : newPosts.length >= 20;
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
    builder.addCase(deleteComment.fulfilled, (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.posts.find(p => p._id === postId);
      if (post) {
        post.comments = post.comments.filter(c => c._id !== commentId);
      }
    });
    builder.addCase(deletePost.fulfilled, (state, action) => {
      state.posts = state.posts.filter(p => p._id !== action.payload.id);
    });
  },
});

export const { clearPosts } = postSlice.actions;
export default postSlice.reducer;
