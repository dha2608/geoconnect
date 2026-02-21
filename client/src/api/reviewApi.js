import API from './axios';

export const reviewApi = {
  getReviews: (pinId, params) => API.get(`/pins/${pinId}/reviews`, { params }),
  createReview: (pinId, data) => API.post(`/pins/${pinId}/reviews`, data),
  updateReview: (pinId, id, data) => API.put(`/pins/${pinId}/reviews/${id}`, data),
  deleteReview: (pinId, id) => API.delete(`/pins/${pinId}/reviews/${id}`),
};
