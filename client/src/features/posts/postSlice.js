import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import { postApi } from '../../api/postApi';

// --- Entity Adapter (O(1) lookups by _id, newest first) ---
const postsAdapter = createEntityAdapter({
  selectId: (post) => post._id,
  sortComparer: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
});

// --- Async Thunks ---
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

// --- Slice ---
const postSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState({
    loading: false,
    error: null,
    hasMore: true,
    page: 1,
  }),
  reducers: {
    clearPosts: (state) => {
      postsAdapter.removeAll(state);
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFeed.pending, (state) => { state.loading = true; });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      state.loading = false;
      const items = action.payload.data || action.payload.posts || action.payload;
      const newPosts = Array.isArray(items) ? items : [];
      const pagination = action.payload.pagination;

      if (state.page === 1) {
        postsAdapter.setAll(state, newPosts);
      } else {
        postsAdapter.upsertMany(state, newPosts);
      }
      state.hasMore = pagination ? pagination.page < pagination.pages : newPosts.length >= 20;
      state.page += 1;
    });
    builder.addCase(fetchFeed.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message;
    });
    builder.addCase(createPost.fulfilled, (state, action) => {
      const post = action.payload.post || action.payload;
      postsAdapter.addOne(state, post);
    });
    builder.addCase(updatePost.fulfilled, (state, action) => {
      const updated = action.payload.post || action.payload;
      postsAdapter.upsertOne(state, updated);
    });
    builder.addCase(togglePostLike.fulfilled, (state, action) => {
      const updated = action.payload.post || action.payload;
      postsAdapter.upsertOne(state, updated);
    });
    builder.addCase(deleteComment.fulfilled, (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.entities[postId];
      if (post) {
        post.comments = post.comments.filter((c) => c._id !== commentId);
      }
    });
    builder.addCase(deletePost.fulfilled, (state, action) => {
      postsAdapter.removeOne(state, action.payload.id);
    });
  },
});

export const { clearPosts } = postSlice.actions;

// --- Memoized Selectors ---
const adapterSelectors = postsAdapter.getSelectors((state) => state.posts);

export const selectAllPosts = adapterSelectors.selectAll;
export const selectPostById = adapterSelectors.selectById;
export const selectPostIds = adapterSelectors.selectIds;
export const selectPostsLoading = (state) => state.posts.loading;
export const selectPostsError = (state) => state.posts.error;
export const selectPostsHasMore = (state) => state.posts.hasMore;
export const selectPostsPage = (state) => state.posts.page;

export default postSlice.reducer;
