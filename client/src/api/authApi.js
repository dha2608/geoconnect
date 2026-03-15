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
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  verifyEmail: (token) => API.post('/auth/verify-email', { token }),
  // 2FA
  get2FAStatus: () => API.get('/auth/2fa/status'),
  setup2FA: () => API.post('/auth/2fa/setup'),
  verify2FA: (code) => API.post('/auth/2fa/verify', { code }),
  disable2FA: (password) => API.post('/auth/2fa/disable', { password }),
  regenerateBackupCodes: (password) => API.post('/auth/2fa/regenerate-backup', { password }),
  login2FA: (data) => API.post('/auth/2fa/login', data),
  loginWithBackupCode: (data) => API.post('/auth/2fa/backup', data),
};
