import API from './axios';

export const pinApi = {
  getViewportPins: (bounds) => API.get('/pins', { params: bounds }),
  getNearbyPins: (params) => API.get('/pins/nearby', { params }),
  getPin: (id) => API.get(`/pins/${id}`),
  createPin: (data) => API.post('/pins', data),
  updatePin: (id, data) => API.put(`/pins/${id}`, data),
  deletePin: (id) => API.delete(`/pins/${id}`),
  toggleLike: (id) => API.post(`/pins/${id}/like`),
  toggleSave: (id) => API.post(`/pins/${id}/save`),
  checkIn: (id) => API.post(`/pins/${id}/checkin`),
  undoCheckIn: (id) => API.delete(`/pins/${id}/checkin`),
  getTrending: () => API.get('/pins/trending'),
  searchPins: (query) => API.get('/pins/search', { params: { q: query } }),
};

export const getSavedPins = (userId) => API.get(`/pins/saved/${userId}`);
