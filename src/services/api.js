/**
 * src/services/api.js
 *
 * Centralised Axios instance for all backend communication.
 *
 * Features:
 *  - Base URL loaded from VITE_API_BASE_URL env var (never hardcoded)
 *  - Request interceptor: automatically injects the JWT from localStorage
 *    into every outgoing request as "Authorization: Bearer <token>"
 *  - Response interceptor: on 401 response, clears the stale token and
 *    redirects to /login so the user is never silently stuck
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach JWT -----------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response interceptor: handle expired/invalid tokens ---------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lf_token');
      localStorage.removeItem('lf_user');
      // Hard redirect — clears all React state too
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
