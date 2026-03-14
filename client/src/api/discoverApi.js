import API from './axios';

export const discoverApi = {
  getFeed: () => API.get('/discover/feed'),
  getRecommended: (params) => API.get('/discover/recommended', { params }),
  getPopularCategories: (params) => API.get('/discover/categories', { params }),
  getSuggestedUsers: () => API.get('/discover/people'),
};
