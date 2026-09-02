import axios from 'axios';

const apiBaseUrl = String(import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api').replace(/\/+$/, '');
const appSlug = String(import.meta.env.VITE_APP_SLUG || 'laora').trim().toLowerCase();
const apiV1BaseUrl = `${apiBaseUrl}/v1/apps/${encodeURIComponent(appSlug)}`;
const legacyProductPrefix = `/${appSlug}`;

const api = axios.create({
  baseURL: apiV1BaseUrl,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'X-Peter-App': appSlug,
  },
});

api.interceptors.request.use((config) => {
  if (typeof config.url === 'string') {
    if (config.url === legacyProductPrefix) config.url = '/';
    else if (config.url.startsWith(`${legacyProductPrefix}/`)) {
      config.url = config.url.slice(legacyProductPrefix.length);
    }
  }

  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Peter-App'] = appSlug;
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

export { apiBaseUrl, apiV1BaseUrl, appSlug };
export default api;
