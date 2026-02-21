import API from './axios';

export const userApi = {
  getProfile: (id) => API.get(`/users/${id}`),
  updateProfile: (data) => API.put('/users/me', data),
  updateLocation: (coords) => API.put('/users/me/location', coords),
  toggleFollow: (id) => API.post(`/users/${id}/follow`),
  getNearbyUsers: (params) => API.get('/users/nearby', { params }),
  searchUsers: (query) => API.get('/users/search', { params: { q: query } }),
  getFollowers: (id) => API.get(`/users/${id}/followers`),
  getFollowing: (id) => API.get(`/users/${id}/following`),
};
