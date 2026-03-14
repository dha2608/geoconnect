import API from './axios';

export const eventApi = {
  getViewportEvents: (bounds, config) => API.get('/events', { params: bounds, ...config }),
  getEvent: (id) => API.get(`/events/${id}`),
  createEvent: (data) => API.post('/events', data),
  updateEvent: (id, data) => API.put(`/events/${id}`, data),
  deleteEvent: (id) => API.delete(`/events/${id}`),
  toggleRsvp: (id) => API.post(`/events/${id}/rsvp`),
  getUpcoming: (limit = 12) => API.get('/events/upcoming', { params: { limit } }),
  searchEvents: (query) => API.get('/events/search', { params: { q: query } }),
};
