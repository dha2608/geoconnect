import API from './axios';

export const userApi = {
  getProfile: (id) => API.get(`/users/${id}`),
  updateProfile: (data) => API.put('/users/me', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return API.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateLocation: (coords) => API.put('/users/me/location', coords),
  toggleFollow: (id) => API.post(`/users/${id}/follow`),
  getNearbyUsers: (params) => API.get('/users/nearby', { params }),
  searchUsers: (query) => API.get('/users/search', { params: { q: query } }),
  getFollowers: (id) => API.get(`/users/${id}/followers`),
  getFollowing: (id) => API.get(`/users/${id}/following`),
  getSettings: () => API.get('/users/me/settings'),
  updateSettings: (settings) => API.put('/users/me/settings', settings),
  blockUser: (id) => API.post(`/users/${id}/block`),
  unblockUser: (id) => API.delete(`/users/${id}/block`),
  getBlockedUsers: () => API.get('/users/me/blocked'),
  getUserStats: (id) => API.get(`/users/${id}/stats`),
};
