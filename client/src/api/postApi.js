import API from './axios';

export const postApi = {
  getFeed: (params) => API.get('/posts/feed', { params }),
  getMapPosts: (bounds) => API.get('/posts/map', { params: bounds }),
  getPost: (id) => API.get(`/posts/${id}`),
  createPost: (data) => API.post('/posts', data),
  updatePost: (id, data) => API.put(`/posts/${id}`, data),
  deletePost: (id) => API.delete(`/posts/${id}`),
  toggleLike: (id) => API.post(`/posts/${id}/like`),
  addComment: (id, data) => API.post(`/posts/${id}/comments`, data),
};

export const getUserPosts = (userId, page = 1) => API.get(`/posts/user/${userId}?page=${page}`);
