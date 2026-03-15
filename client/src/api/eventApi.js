import API from './axios';

export const eventApi = {
  getViewportEvents: (bounds, config) => API.get('/events', { params: bounds, ...config }),
  getEvent: (id) => API.get(`/events/${id}`),
  createEvent: (data) => API.post('/events', data),
  updateEvent: (id, data) => API.put(`/events/${id}`, data),
  deleteEvent: (id) => API.delete(`/events/${id}`),
  toggleRsvp: (id) => API.post(`/events/${id}/rsvp`),
  cancelRsvp: (id) => API.delete(`/events/${id}/rsvp`),
  getUpcoming: (params) => API.get('/events/upcoming', { params }),
  searchEvents: (params) => API.get('/events/search', { params }),

  // Recurring
  getRecurringInstances: (id, params) => API.get(`/events/${id}/recurring`, { params }),

  // Tags
  getPopularTags: () => API.get('/events/tags/popular'),
  getEventsByTag: (tag, params) => API.get(`/events/tags/${encodeURIComponent(tag)}`, { params }),

  // Comments
  getEventComments: (eventId, params) => API.get(`/events/${eventId}/comments`, { params }),
  addEventComment: (eventId, data) => API.post(`/events/${eventId}/comments`, data),
  editEventComment: (eventId, commentId, data) => API.put(`/events/${eventId}/comments/${commentId}`, data),
  deleteEventComment: (eventId, commentId) => API.delete(`/events/${eventId}/comments/${commentId}`),
  likeEventComment: (eventId, commentId) => API.post(`/events/${eventId}/comments/${commentId}/like`),
  unlikeEventComment: (eventId, commentId) => API.delete(`/events/${eventId}/comments/${commentId}/like`),
};
