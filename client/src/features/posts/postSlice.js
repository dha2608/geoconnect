import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
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

export const editComment = createAsyncThunk('posts/editComment', async ({ postId, commentId, text }, { rejectWithValue }) => {
  try { const res = await postApi.editComment(postId, commentId, { text }); return { postId, comment: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const likeComment = createAsyncThunk('posts/likeComment', async ({ postId, commentId }, { rejectWithValue }) => {
  try { const res = await postApi.likeComment(postId, commentId); return { postId, comment: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const unlikeComment = createAsyncThunk('posts/unlikeComment', async ({ postId, commentId }, { rejectWithValue }) => {
  try { const res = await postApi.unlikeComment(postId, commentId); return { postId, comment: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Nested Replies ---
export const replyToComment = createAsyncThunk('posts/replyToComment', async ({ postId, commentId, text }, { rejectWithValue }) => {
  try { const res = await postApi.replyToComment(postId, commentId, { text }); return { postId, commentId, reply: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchReplies = createAsyncThunk('posts/fetchReplies', async ({ postId, commentId, params }, { rejectWithValue }) => {
  try { const res = await postApi.getReplies(postId, commentId, params); return { commentId, data: res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deleteReply = createAsyncThunk('posts/deleteReply', async ({ postId, commentId, replyId }, { rejectWithValue }) => {
  try { await postApi.deleteReply(postId, commentId, replyId); return { postId, commentId, replyId }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- Comment Reactions ---
export const addCommentReaction = createAsyncThunk('posts/addCommentReaction', async ({ postId, commentId, emoji }, { rejectWithValue }) => {
  try { const res = await postApi.addCommentReaction(postId, commentId, { emoji }); return { postId, comment: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const removeCommentReaction = createAsyncThunk('posts/removeCommentReaction', async ({ postId, commentId }, { rejectWithValue }) => {
  try { const res = await postApi.removeCommentReaction(postId, commentId); return { postId, comment: res.data.data || res.data }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const deletePost = createAsyncThunk('posts/delete', async (id, { rejectWithValue }) => {
  try { await postApi.deletePost(id); return { id }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- New Thunks: Save / Bookmark ---
export const savePost = createAsyncThunk('posts/save', async (id, { rejectWithValue }) => {
  try { const res = await postApi.savePost(id); return { id, saves: res.data.data?.saves || res.data.saves }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const unsavePost = createAsyncThunk('posts/unsave', async (id, { rejectWithValue }) => {
  try { const res = await postApi.unsavePost(id); return { id, saves: res.data.data?.saves || res.data.saves }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const fetchSavedPosts = createAsyncThunk('posts/fetchSaved', async (params, { rejectWithValue }) => {
  try { const res = await postApi.getSavedPosts(params); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- New Thunks: Share & Repost ---
export const sharePost = createAsyncThunk('posts/share', async (id, { rejectWithValue }) => {
  try { const res = await postApi.sharePost(id); return { id, shareCount: res.data.data?.shareCount || res.data.shareCount }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const repostPost = createAsyncThunk('posts/repost', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await postApi.repostPost(id, data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const undoRepost = createAsyncThunk('posts/undoRepost', async (id, { rejectWithValue }) => {
  try { await postApi.undoRepost(id); return { id }; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// --- New Thunks: Hashtags ---
export const fetchPostsByHashtag = createAsyncThunk('posts/fetchByHashtag', async ({ tag, params }, { rejectWithValue }) => {
  try { const res = await postApi.getPostsByHashtag(tag, params); return res.data; }
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
    savedPosts: [],
    savedLoading: false,
  }),
  reducers: {
    clearPosts: (state) => {
      postsAdapter.removeAll(state);
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // Feed
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

    // Create
    builder.addCase(createPost.fulfilled, (state, action) => {
      const post = action.payload.data || action.payload.post || action.payload;
      postsAdapter.addOne(state, post);
    });

    // Update
    builder.addCase(updatePost.fulfilled, (state, action) => {
      const updated = action.payload.data || action.payload.post || action.payload;
      postsAdapter.upsertOne(state, updated);
    });

    // Like
    builder.addCase(togglePostLike.fulfilled, (state, action) => {
      const data = action.payload.data || action.payload;
      if (data.likes && action.meta?.arg) {
        const post = state.entities[action.meta.arg];
        if (post) post.likes = data.likes;
      }
    });

    // Delete
    builder.addCase(deletePost.fulfilled, (state, action) => {
      postsAdapter.removeOne(state, action.payload.id);
    });

    // Comments
    builder.addCase(addComment.fulfilled, (state, action) => {
      const comment = action.payload.data || action.payload;
      const postId = comment.post;
      const post = state.entities[postId];
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(comment);
        post.commentCount = (post.commentCount || 0) + 1;
      }
    });
    builder.addCase(deleteComment.fulfilled, (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.entities[postId];
      if (post) {
        post.comments = post.comments.filter((c) => c._id !== commentId);
        if (post.commentCount > 0) post.commentCount -= 1;
      }
    });
    builder.addCase(editComment.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.entities[postId];
      if (post && post.comments) {
        const idx = post.comments.findIndex((c) => c._id === comment._id);
        if (idx !== -1) post.comments[idx] = comment;
      }
    });
    builder.addCase(likeComment.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.entities[postId];
      if (post && post.comments) {
        const idx = post.comments.findIndex((c) => c._id === comment._id);
        if (idx !== -1) post.comments[idx] = comment;
      }
    });
    builder.addCase(unlikeComment.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.entities[postId];
      if (post && post.comments) {
        const idx = post.comments.findIndex((c) => c._id === comment._id);
        if (idx !== -1) post.comments[idx] = comment;
      }
    });

    // Reply to comment — increment replyCount on parent
    builder.addCase(replyToComment.fulfilled, (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.entities[postId];
      if (post) {
        post.commentCount = (post.commentCount || 0) + 1;
        if (post.comments) {
          const parent = post.comments.find((c) => c._id === commentId);
          if (parent) parent.replyCount = (parent.replyCount || 0) + 1;
        }
      }
    });
    // Delete reply — decrement replyCount on parent
    builder.addCase(deleteReply.fulfilled, (state, action) => {
      const { postId, commentId } = action.payload;
      const post = state.entities[postId];
      if (post) {
        if (post.commentCount > 0) post.commentCount -= 1;
        if (post.comments) {
          const parent = post.comments.find((c) => c._id === commentId);
          if (parent && parent.replyCount > 0) parent.replyCount -= 1;
        }
      }
    });
    // Comment reactions — update comment in post.comments
    builder.addCase(addCommentReaction.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.entities[postId];
      if (post && post.comments) {
        const idx = post.comments.findIndex((c) => c._id === comment._id);
        if (idx !== -1) post.comments[idx] = comment;
      }
    });
    builder.addCase(removeCommentReaction.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      const post = state.entities[postId];
      if (post && post.comments) {
        const idx = post.comments.findIndex((c) => c._id === comment._id);
        if (idx !== -1) post.comments[idx] = comment;
      }
    });

    // Save / Bookmark
    builder.addCase(savePost.fulfilled, (state, action) => {
      const { id, saves } = action.payload;
      const post = state.entities[id];
      if (post && saves) post.saves = saves;
    });
    builder.addCase(unsavePost.fulfilled, (state, action) => {
      const { id, saves } = action.payload;
      const post = state.entities[id];
      if (post && saves) post.saves = saves;
    });
    builder.addCase(fetchSavedPosts.pending, (state) => { state.savedLoading = true; });
    builder.addCase(fetchSavedPosts.fulfilled, (state, action) => {
      state.savedLoading = false;
      const items = action.payload.data || action.payload;
      state.savedPosts = Array.isArray(items) ? items : [];
    });
    builder.addCase(fetchSavedPosts.rejected, (state) => { state.savedLoading = false; });

    // Share
    builder.addCase(sharePost.fulfilled, (state, action) => {
      const { id, shareCount } = action.payload;
      const post = state.entities[id];
      if (post) post.shareCount = shareCount;
    });

    // Repost
    builder.addCase(repostPost.fulfilled, (state, action) => {
      const repost = action.payload.data || action.payload;
      postsAdapter.addOne(state, repost);
    });
    builder.addCase(undoRepost.fulfilled, (state, action) => {
      // Remove the repost from the feed (user's repost of this post)
      const originalId = action.payload.id;
      const ids = Object.keys(state.entities);
      for (const id of ids) {
        const post = state.entities[id];
        if (post && post.repostOf && (post.repostOf === originalId || post.repostOf._id === originalId)) {
          postsAdapter.removeOne(state, id);
          break;
        }
      }
    });

    // Hashtag posts — upsert into main adapter
    builder.addCase(fetchPostsByHashtag.fulfilled, (state, action) => {
      const items = action.payload.data || action.payload;
      const posts = Array.isArray(items) ? items : [];
      postsAdapter.upsertMany(state, posts);
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
export const selectSavedPosts = (state) => state.posts.savedPosts;
export const selectSavedLoading = (state) => state.posts.savedLoading;

export const selectPostsByAuthor = (userId) => createSelector(
  [selectAllPosts],
  (posts) => posts.filter((p) => (p.author?._id ?? p.author) === userId)
);

export default postSlice.reducer;
