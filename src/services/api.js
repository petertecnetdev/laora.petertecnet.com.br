import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api',
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'X-Peter-App': import.meta.env.VITE_APP_SLUG || 'laora',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
