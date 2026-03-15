import API from './axios';

export const adminApi = {
  // Dashboard
  getStats: () => API.get('/admin/stats'),
  
  // Users
  getUsers: (params) => API.get('/admin/users', { params }),
  getUser: (id) => API.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => API.put(`/admin/users/${id}/role`, { role }),
  toggleBanUser: (id, data) => API.put(`/admin/users/${id}/ban`, data),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  
  // Content
  getContent: (params) => API.get('/admin/content', { params }),
  deleteContent: (type, id) => API.delete(`/admin/content/${type}/${id}`),
};

// Also add admin report functions
export const adminReportApi = {
  getReports: (params) => API.get('/reports', { params }),
  getReportStats: () => API.get('/reports/stats'),
  getReport: (id) => API.get(`/reports/${id}`),
  updateReportStatus: (id, data) => API.put(`/reports/${id}`, data),
  deleteReport: (id) => API.delete(`/reports/${id}`),
};
