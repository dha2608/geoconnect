import API from './axios';

export const collectionApi = {
  getMyCollections: () => API.get('/collections/mine'),
  getCollection: (id) => API.get(`/collections/${id}`),
  createCollection: (data) => API.post('/collections', data),
  updateCollection: (id, data) => API.put(`/collections/${id}`, data),
  deleteCollection: (id) => API.delete(`/collections/${id}`),
  addPin: (collectionId, pinId) => API.post(`/collections/${collectionId}/pins/${pinId}`),
  removePin: (collectionId, pinId) => API.delete(`/collections/${collectionId}/pins/${pinId}`),
  getPublicCollections: () => API.get('/collections/public'),
};
