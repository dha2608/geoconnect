import API from './axios';

export const eventApi = {
  getViewportEvents: (bounds) => API.get('/events', { params: bounds }),
  getEvent: (id) => API.get(`/events/${id}`),
  createEvent: (data) => API.post('/events', data),
  updateEvent: (id, data) => API.put(`/events/${id}`, data),
  deleteEvent: (id) => API.delete(`/events/${id}`),
  toggleRsvp: (id) => API.post(`/events/${id}/rsvp`),
};
