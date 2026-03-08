import axios from 'axios';
import { store } from '../app/store';
import { forceLogout } from '../features/auth/authSlice';

// In development, Vite proxy forwards /api → localhost:5000
// In production, VITE_API_URL points to the actual backend (e.g. Render)
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const API = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000, // 15s timeout — fail fast instead of hanging forever
});

// Request interceptor - attach access token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 with token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      resolve(API(config));
    } else {
      reject(error);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.accessToken;
        localStorage.setItem('accessToken', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Use Redux action instead of hard redirect — React Router handles navigation
        store.dispatch(forceLogout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Retry interceptor — retries failed GET requests (network errors / 5xx), max 2 times with backoff
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

API.interceptors.response.use(null, async (error) => {
  const config = error.config;

  // Don't retry if no config, or retry limit reached
  if (!config || config._retryCount >= MAX_RETRIES) return Promise.reject(error);
  // Don't retry auth/validation errors — let the 401 refresh interceptor handle those
  if (error.response?.status === 401 || error.response?.status === 403) return Promise.reject(error);
  if (error.response?.status === 400 || error.response?.status === 422) return Promise.reject(error);
  // Only retry idempotent GET requests
  if (config.method !== 'get') return Promise.reject(error);

  config._retryCount = (config._retryCount || 0) + 1;

  // Exponential-ish backoff: 1s, 2s
  await new Promise((r) => setTimeout(r, RETRY_DELAY * config._retryCount));
  return API(config);
});

export default API;
