import axios from 'axios';
// Vite replaces VITE_API_URL at build time. Local development keeps the API on
// localhost; production defaults to a same-origin /api reverse proxy.
const devFallbackUrls = [
  'http://localhost:4000/api',
  'http://127.0.0.1:4000/api',
  'http://localhost:4001/api',
  'http://127.0.0.1:4001/api'
];
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = (() => {
  if (!configuredApiUrl) return import.meta.env.DEV ? devFallbackUrls[0] : '/api';
  const cleanUrl = configuredApiUrl.replace(/\/+$/, '');
  if (cleanUrl === '/') return '/api';
  return /\/api$/i.test(cleanUrl) ? cleanUrl : `${cleanUrl}/api`;
})();

export const api = axios.create({ baseURL: apiBaseUrl, timeout: 20000 });
api.interceptors.request.use(config => { const token = localStorage.getItem('yaza-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 404) {
    error.apiHint = 'Signup API route not found (404). Set VITE_API_URL to your deployed API host, then rebuild the frontend. The API route must be /api/auth/register.';
  }
  return Promise.reject(error);
});
