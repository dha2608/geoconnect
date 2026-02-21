import API from './axios';

export const authApi = {
  register: (data) => API.post('/auth/register', data),
  login: (credentials) => API.post('/auth/login', credentials),
  logout: () => API.post('/auth/logout'),
  refreshToken: () => API.post('/auth/refresh'),
  guestLogin: () => API.post('/auth/guest'),
  getMe: () => API.get('/users/me'),
  googleLogin: () => { window.location.href = '/api/auth/google'; },
  githubLogin: () => { window.location.href = '/api/auth/github'; },
};
