import axios from 'axios';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const API_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
const VERIFICATION_RESEND_COOLDOWN_MS = 60000;
const VERIFICATION_RESEND_STORAGE_KEY = `peter:${APP_SLUG}:verification-resend-at`;
const TELEMETRY_SESSION_KEY = `peter:${APP_SLUG}:telemetry-session`;
const DEFAULT_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 45000;
let verificationResendInFlight = false;

const getLastVerificationResendAt = () => {
  try {
    const value = Number(window.localStorage.getItem(VERIFICATION_RESEND_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const setLastVerificationResendAt = (value) => {
  try {
    window.localStorage.setItem(VERIFICATION_RESEND_STORAGE_KEY, String(value));
  } catch {
    // Storage can be unavailable in privacy-restricted browsers; in-flight protection still applies.
  }
};

const telemetrySessionId = () => {
  try {
    let value = window.sessionStorage.getItem(TELEMETRY_SESSION_KEY);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(TELEMETRY_SESSION_KEY, value);
    }
    return value;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const funnelEventFor = (config) => {
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '').split('?')[0];
  if (method === 'post' && url.endsWith('/auth/register')) return 'activation_registered';
  if (method === 'post' && url.endsWith('/auth/email-verify')) return 'activation_email_verified';
  if (method === 'put' && url.endsWith('/laora/profile')) return 'activation_profile_saved';
  if (method === 'post' && url.endsWith('/laora/profile/photos')) return 'activation_photo_uploaded';
  return null;
};

const recordFunnelEvent = (type) => {
  if (!type) return;
  const token = window.localStorage.getItem('token');
  const event = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    label: 'activation_funnel',
    target: APP_SLUG,
    metadata: { application: APP_SLUG, funnel: 'activation', source: 'frontend' },
  };

  // Telemetry must never delay or break the conversion path it measures.
  window.fetch(`${API_URL}/interactions/batch`, {
    method: 'POST',
    keepalive: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Peter-App': APP_SLUG,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id: telemetrySessionId(), events: [event] }),
  }).catch(() => {});
};

const isVerificationResend = (config) => {
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '');
  return method === 'post' && url.includes('/auth/resend-code-email-verification');
};

const isMultipartUpload = (config) => {
  if (typeof FormData === 'undefined' || !(config?.data instanceof FormData)) return false;
  const method = String(config?.method || '').toLowerCase();
  return ['post', 'put', 'patch'].includes(method);
};

const api = axios.create({
  baseURL: API_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'X-Peter-App': APP_SLUG,
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Frontend-Page'] = window.location.pathname;

  // Mobile photo uploads can legitimately exceed the normal API timeout on slow networks.
  // Keep ordinary requests fail-fast while giving multipart writes enough time to complete.
  if (isMultipartUpload(config) && (!config.timeout || config.timeout === DEFAULT_TIMEOUT_MS)) {
    config.timeout = UPLOAD_TIMEOUT_MS;
  }

  if (isVerificationResend(config)) {
    if (verificationResendInFlight) {
      return Promise.reject(new Error('O reenvio do código já está em andamento.'));
    }

    const now = Date.now();
    const remainingMs = VERIFICATION_RESEND_COOLDOWN_MS - (now - getLastVerificationResendAt());
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
      setLastVerificationResendAt(Date.now());
    }
    recordFunnelEvent(funnelEventFor(response?.config));
    return response;
  },
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const method = String(config?.method || '').toLowerCase();
    // A 429 is an explicit back-pressure signal, not a transient transport failure. Retrying it
    // automatically creates a synchronized request burst and makes shared API saturation worse.
    const transientFailure = !error?.response || status === 408 || status >= 500;

    if (config?.__peterVerificationResend) {
      verificationResendInFlight = false;
      // A server-side rate limit means the resend was received and rejected intentionally.
      // Persist the client cooldown too, preventing repeated 429s across reloads/tabs and
      // protecting the shared identity/email infrastructure from unnecessary traffic.
      if (status === 429) setLastVerificationResendAt(Date.now());
    }

    // Retry only idempotent reads after transport/server failures. Respect HTTP 429 without an
    // automatic retry so callers can surface back-pressure instead of amplifying it.
    if (config && method === 'get' && transientFailure && !config.__peterRetried) {
      config.__peterRetried = true;
      await new Promise((resolve) => window.setTimeout(resolve, 350));
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