import API from './axios';

export const messageApi = {
  getConversations: () => API.get('/messages/conversations'),
  getMessages: (conversationId, params) => API.get(`/messages/${conversationId}`, { params }),
  sendMessage: (conversationId, data) => API.post(`/messages/${conversationId}`, data),
};
