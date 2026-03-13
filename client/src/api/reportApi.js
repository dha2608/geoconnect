import API from './axios';

export const reportApi = {
  createReport: (data) => API.post('/reports', data),
};
