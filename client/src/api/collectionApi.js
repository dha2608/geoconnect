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
  // Collaborators
  addCollaborator: (id, data) => API.post(`/collections/${id}/collaborators`, data),
  updateCollaboratorRole: (id, userId, data) => API.put(`/collections/${id}/collaborators/${userId}`, data),
  removeCollaborator: (id, userId) => API.delete(`/collections/${id}/collaborators/${userId}`),
  // Share links
  generateShareLink: (id) => API.post(`/collections/${id}/share`),
  revokeShareLink: (id) => API.delete(`/collections/${id}/share`),
  getSharedCollection: (token) => API.get(`/collections/shared/${token}`),
  joinViaShareLink: (token) => API.post(`/collections/shared/${token}/join`),
};
