import API from './axios';

export const postApi = {
  getFeed: (params) => API.get('/posts/feed', { params }),
  getMapPosts: (bounds) => API.get('/posts/map', { params: bounds }),
  getPost: (id) => API.get(`/posts/${id}`),
  createPost: (data) => API.post('/posts', data),
  updatePost: (id, data) => API.put(`/posts/${id}`, data),
  deletePost: (id) => API.delete(`/posts/${id}`),
  toggleLike: (id) => API.post(`/posts/${id}/like`),
  unlikePost: (id) => API.delete(`/posts/${id}/like`),

  // Save / Bookmark
  savePost: (id) => API.post(`/posts/${id}/save`),
  unsavePost: (id) => API.delete(`/posts/${id}/save`),
  getSavedPosts: (params) => API.get('/posts/saved', { params }),

  // Share & Repost
  sharePost: (id) => API.post(`/posts/${id}/share`),
  repostPost: (id, data) => API.post(`/posts/${id}/repost`, data),
  undoRepost: (id) => API.delete(`/posts/${id}/repost`),

  // Hashtags
  getPostsByHashtag: (tag, params) => API.get(`/posts/hashtag/${encodeURIComponent(tag)}`, { params }),

  // Comments
  addComment: (id, data) => API.post(`/posts/${id}/comments`, data),
  editComment: (postId, commentId, data) => API.put(`/posts/${postId}/comments/${commentId}`, data),
  deleteComment: (postId, commentId) => API.delete(`/posts/${postId}/comments/${commentId}`),
  likeComment: (postId, commentId) => API.post(`/posts/${postId}/comments/${commentId}/like`),
  unlikeComment: (postId, commentId) => API.delete(`/posts/${postId}/comments/${commentId}/like`),

  // Comment Replies
  replyToComment: (postId, commentId, data) => API.post(`/posts/${postId}/comments/${commentId}/replies`, data),
  getReplies: (postId, commentId, params) => API.get(`/posts/${postId}/comments/${commentId}/replies`, { params }),
  deleteReply: (postId, commentId, replyId) => API.delete(`/posts/${postId}/comments/${commentId}/replies/${replyId}`),

  // Comment Reactions
  addCommentReaction: (postId, commentId, data) => API.post(`/posts/${postId}/comments/${commentId}/reactions`, data),
  removeCommentReaction: (postId, commentId) => API.delete(`/posts/${postId}/comments/${commentId}/reactions`),
};

export const getUserPosts = (userId, page = 1) => API.get(`/posts/user/${userId}?page=${page}`);
