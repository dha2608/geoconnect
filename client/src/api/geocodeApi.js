import API from './axios';

export const geocodeApi = {
  search: (query) => API.get('/geocode/search', { params: { q: query } }),
  reverse: (lat, lng) => API.get('/geocode/reverse', { params: { lat, lng } }),
};
