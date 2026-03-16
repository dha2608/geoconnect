import API from './axios';

// Abort controller for in-flight geocode requests — cancels the previous
// request when a new one is fired, preventing stale results from arriving
// after the user has already typed something new.
let searchAbortController = null;

export const geocodeApi = {
  search: (query, { lat, lng } = {}) => {
    // Cancel any previous in-flight search
    if (searchAbortController) searchAbortController.abort();
    searchAbortController = new AbortController();

    const params = { q: query };
    if (lat != null && lng != null) {
      params.lat = lat;
      params.lng = lng;
    }

    return API.get('/geocode/search', {
      params,
      signal: searchAbortController.signal,
    });
  },

  reverse: (lat, lng) => API.get('/geocode/reverse', { params: { lat, lng } }),
};
