import API from './axios';

export const activityApi = {
  getStats: () => API.get('/users/me/activity/stats'),
  getRecentActivity: (params) => API.get('/users/me/activity/recent', { params }),
  getActivityHeatmap: (params) => API.get('/users/me/activity/heatmap', { params }),
};
