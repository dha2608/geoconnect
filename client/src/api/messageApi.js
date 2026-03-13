import API from './axios';

export const messageApi = {
  getConversations: () => API.get('/messages/conversations'),
  createConversation: (recipientId) => API.post('/messages/conversations', { recipientId }),
  getUnreadCount: () => API.get('/messages/unread-count'),
  getMessages: (conversationId, params) => API.get(`/messages/${conversationId}`, { params }),
  sendMessage: (conversationId, data) => API.post(`/messages/${conversationId}`, data),
  markConversationRead: (conversationId) => API.put(`/messages/${conversationId}/read`),
  deleteMessage: (conversationId, messageId) =>
    API.delete(`/messages/${conversationId}/messages/${messageId}`),
};
