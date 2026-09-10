import axios from 'axios';

const VERIFICATION_RESEND_COOLDOWN_MS = 60000;
let lastVerificationResendAt = 0;
let verificationResendInFlight = false;

const isVerificationResend = (config) => {
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '');
  return method === 'post' && url.includes('/auth/resend-code-email-verification');
};

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

  if (isVerificationResend(config)) {
    if (verificationResendInFlight) {
      return Promise.reject(new Error('O reenvio do código já está em andamento.'));
    }

    const now = Date.now();
    const remainingMs = VERIFICATION_RESEND_COOLDOWN_MS - (now - lastVerificationResendAt);
    if (remainingMs > 0) {
      return Promise.reject(new Error(`Aguarde ${Math.ceil(remainingMs / 1000)} segundos para reenviar o código.`));
    }

    verificationResendInFlight = true;
    config.__peterVerificationResend = true;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response?.config?.__peterVerificationResend) {
      verificationResendInFlight = false;
      lastVerificationResendAt = Date.now();
    }
    return response;
  },
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const method = String(config?.method || '').toLowerCase();
    const transientFailure = !error?.response || status === 408 || status === 429 || status >= 500;

    if (config?.__peterVerificationResend) {
      verificationResendInFlight = false;
    }

    // Retry only idempotent reads. Never retry writes, auth mutations, swipes or messages.
    if (config && method === 'get' && transientFailure && !config.__peterRetried) {
      config.__peterRetried = true;
      await new Promise((resolve) => window.setTimeout(resolve, status === 429 ? 900 : 350));
      return api.request(config);
    }

    if (status === 401 && !String(config?.url || '').includes('/auth/login')) {
      ['token', 'access_token', 'auth_token', 'user'].forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new Event('authChanged'));
    }
    return Promise.reject(error);
  },
);

export default api;