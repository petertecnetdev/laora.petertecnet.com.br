import axios from 'axios';

const appSlug = String(import.meta.env.VITE_APP_SLUG || 'laora').trim().toLowerCase();
const apiRoot = String(import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api').replace(/\/+$/, '');
const apiV1BaseUrl = `${apiRoot}/v1/apps/${encodeURIComponent(appSlug)}`;

const api = axios.create({
  baseURL: apiV1BaseUrl,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'X-Peter-App': appSlug,
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  config.headers = config.headers || {};
  config.headers['X-Peter-App'] = appSlug;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Frontend-Page'] = window.location.pathname;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !String(error?.config?.url || '').includes('/auth/login')) {
      ['token', 'access_token', 'auth_token', 'user'].forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new Event('authChanged'));
    }
    return Promise.reject(error);
  },
);

export default api;
