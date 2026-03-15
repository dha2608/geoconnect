import api from './axios';

export const getConversations = (params) => api.get('/messages/conversations', { params });
export const createConversation = (data) => api.post('/messages/conversations', data);
export const getUnreadCount = () => api.get('/messages/unread-count');
export const getMessages = (conversationId, params) =>
  api.get(`/messages/${conversationId}`, { params });
export const sendMessage = (conversationId, data) =>
  api.post(`/messages/${conversationId}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
export const markConversationRead = (conversationId) =>
  api.put(`/messages/${conversationId}/read`);
export const deleteMessage = (conversationId, messageId) =>
  api.delete(`/messages/${conversationId}/messages/${messageId}`);

// New: Edit message
export const editMessage = (messageId, data) =>
  api.put(`/messages/messages/${messageId}`, data);

// New: Reactions
export const addReaction = (messageId, emoji) =>
  api.post(`/messages/messages/${messageId}/reactions`, { emoji });
export const removeReaction = (messageId) =>
  api.delete(`/messages/messages/${messageId}/reactions`);
