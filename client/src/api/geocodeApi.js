import API from './axios';

// Abort controller for in-flight geocode requests — cancels the previous
// request when a new one is fired, preventing stale results from arriving
// after the user has already typed something new.
let searchAbortController = null;

export const geocodeApi = {
  search: (query) => {
    // Cancel any previous in-flight search
    if (searchAbortController) searchAbortController.abort();
    searchAbortController = new AbortController();

    return API.get('/geocode/search', {
      params: { q: query },
      signal: searchAbortController.signal,
    });
  },

  reverse: (lat, lng) => API.get('/geocode/reverse', { params: { lat, lng } }),
};
