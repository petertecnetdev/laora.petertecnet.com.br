import axios from 'axios';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const API_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
const CONNECTIONS_BASE = `/v1/apps/${encodeURIComponent(APP_SLUG)}/connections`;
const VERIFICATION_RESEND_COOLDOWN_MS = 60000;
const VERIFICATION_RESEND_STORAGE_KEY = `peter:${APP_SLUG}:verification-resend-at`;
const TELEMETRY_SESSION_KEY = `peter:${APP_SLUG}:telemetry-session`;
const TELEMETRY_DEDUPE_PREFIX = `peter:${APP_SLUG}:telemetry:`;
const ACQUISITION_ATTRIBUTION_KEY = `peter:${APP_SLUG}:acquisition-attribution`;
const ACQUISITION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
export const DISCOVERY_RECOVERY_OPENED_KEY = `peter:${APP_SLUG}:discovery-recovery-opened`;
const DISCOVERY_RECOVERY_AWAITING_KEY = `peter:${APP_SLUG}:discovery-recovery-awaiting`;
const DEFAULT_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 45000;
let verificationResendInFlight = false;

const canonicalConnectionUrl = (url = '') => {
  const [path, query = ''] = String(url).split('?');
  let canonical = path;
  if (path === '/laora/profile') canonical = `${CONNECTIONS_BASE}/profile`;
  else if (path === '/laora/profile/photos') canonical = `${CONNECTIONS_BASE}/profile/photos`;
  else if (path === '/laora/profile/photos/reorder') canonical = `${CONNECTIONS_BASE}/profile/photos/reorder`;
  else if (/^\/laora\/profile\/photos\/\d+$/.test(path)) canonical = path.replace('/laora/profile/photos/', `${CONNECTIONS_BASE}/profile/photos/`);
  else if (path === '/laora/discover') canonical = `${CONNECTIONS_BASE}/discover`;
  else if (path === '/laora/swipes') canonical = `${CONNECTIONS_BASE}/decisions`;
  else if (path === '/laora/matches') canonical = `${CONNECTIONS_BASE}/matches`;
  else if (/^\/laora\/matches\/\d+(\/messages)?$/.test(path)) canonical = path.replace('/laora/matches/', `${CONNECTIONS_BASE}/matches/`);
  else if (/^\/laora\/users\/\d+\/block$/.test(path)) canonical = path.replace('/laora/users/', `${CONNECTIONS_BASE}/users/`);
  else if (path === '/laora/reports') canonical = `${CONNECTIONS_BASE}/reports`;
  else if (path === '/laora/privacy/export') canonical = `${CONNECTIONS_BASE}/privacy/export`;
  else if (path === '/laora/privacy/profile') canonical = `${CONNECTIONS_BASE}/privacy/profile`;
  return query ? `${canonical}?${query}` : canonical;
};

const getLastVerificationResendAt = () => {
  try { const value = Number(window.localStorage.getItem(VERIFICATION_RESEND_STORAGE_KEY)); return Number.isFinite(value) && value > 0 ? value : 0; }
  catch { return 0; }
};
const setLastVerificationResendAt = (value) => { try { window.localStorage.setItem(VERIFICATION_RESEND_STORAGE_KEY, String(value)); } catch { /* noop */ } };
const telemetrySessionId = () => {
  try {
    let value = window.sessionStorage.getItem(TELEMETRY_SESSION_KEY);
    if (!value) { value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; window.sessionStorage.setItem(TELEMETRY_SESSION_KEY, value); }
    return value;
  } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
};
const acquisitionMetadata = () => {
  try {
    const raw = window.localStorage.getItem(ACQUISITION_ATTRIBUTION_KEY); if (!raw) return {};
    const stored = JSON.parse(raw); if (!stored || typeof stored !== 'object') return {};
    const attribution = {};
    ACQUISITION_KEYS.forEach((key) => { if (typeof stored[key] === 'string' && stored[key]) attribution[key] = stored[key].slice(0, 160); });
    if (typeof stored.landing_path === 'string' && stored.landing_path) attribution.acquisition_landing_path = stored.landing_path.slice(0, 240);
    if (typeof stored.captured_at === 'string' && stored.captured_at) attribution.acquisition_captured_at = stored.captured_at;
    return Object.keys(attribution).length ? { acquisition: attribution } : {};
  } catch { return {}; }
};
const sessionFlag = (key) => { try { return window.sessionStorage.getItem(key) === '1'; } catch { return false; } };
const setSessionFlag = (key, value) => { try { if (value) window.sessionStorage.setItem(key, '1'); else window.sessionStorage.removeItem(key); } catch { /* noop */ } };

const funnelEventsFor = (response) => {
  const config = response?.config;
  const method = String(config?.method || '').toLowerCase();
  const url = String(config?.url || '').split('?')[0];
  const events = [];
  if (method === 'post' && url.endsWith('/auth/register')) events.push(['activation_registered', 'activation', true]);
  if (method === 'post' && url.endsWith('/auth/email-verify')) events.push(['activation_email_verified', 'activation', true]);
  if (method === 'put' && url.endsWith('/connections/profile')) {
    events.push(['activation_profile_saved', 'activation', true]);
    if (sessionFlag(DISCOVERY_RECOVERY_OPENED_KEY)) {
      events.push(['engagement_discovery_filters_adjusted', 'engagement', false]);
      setSessionFlag(DISCOVERY_RECOVERY_OPENED_KEY, false); setSessionFlag(DISCOVERY_RECOVERY_AWAITING_KEY, true);
    }
  }
  if (method === 'post' && url.endsWith('/connections/profile/photos')) events.push(['activation_photo_uploaded', 'activation', true]);
  if (method === 'get' && url.endsWith('/connections/discover')) {
    events.push(['engagement_discovery_viewed', 'engagement', true]);
    const discoveredProfiles = response?.data?.data;
    if (Array.isArray(discoveredProfiles)) {
      events.push([discoveredProfiles.length > 0 ? 'engagement_discovery_available' : 'engagement_discovery_empty', 'engagement', true]);
      if (discoveredProfiles.length > 0 && sessionFlag(DISCOVERY_RECOVERY_AWAITING_KEY)) { events.push(['engagement_discovery_recovered', 'engagement', false]); setSessionFlag(DISCOVERY_RECOVERY_AWAITING_KEY, false); }
    }
  }
  if (method === 'post' && url.endsWith('/connections/decisions') && config?.__peterSwipeAction === 'like') {
    events.push(['engagement_like_sent', 'engagement', false]);
    if (response?.data?.data?.matched) events.push(['engagement_match_created', 'engagement', false]);
  }
  if (method === 'post' && /\/connections\/matches\/[^/]+\/messages$/.test(url)) events.push(['engagement_conversation_started', 'engagement', true]);
  return events;
};

export const recordFunnelEvent = (type, funnel, dedupe = false) => {
  try {
    if (!type) return;
    if (dedupe) {
      try { const key = `${TELEMETRY_DEDUPE_PREFIX}${type}`; if (window.sessionStorage.getItem(key)) return; window.sessionStorage.setItem(key, '1'); } catch { /* noop */ }
    }
    let token = null; try { token = window.localStorage.getItem('token'); } catch { /* noop */ }
    const event = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, timestamp: new Date().toISOString(), page: window.location.pathname, label: `${funnel}_funnel`, target: APP_SLUG, metadata: { application: APP_SLUG, funnel, source: 'frontend', ...acquisitionMetadata() } };
    window.fetch(`${API_URL}/interactions/batch`, { method: 'POST', keepalive: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Peter-App': APP_SLUG, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ session_id: telemetrySessionId(), events: [event] }) }).catch(() => {});
  } catch { /* Analytics must never block product actions. */ }
};

const isVerificationResend = (config) => String(config?.method || '').toLowerCase() === 'post' && String(config?.url || '').includes('/auth/resend-code-email-verification');
const isMultipartUpload = (config) => typeof FormData !== 'undefined' && config?.data instanceof FormData && ['post', 'put', 'patch'].includes(String(config?.method || '').toLowerCase());
const api = axios.create({ baseURL: API_URL, timeout: DEFAULT_TIMEOUT_MS, headers: { Accept: 'application/json', 'X-Peter-App': APP_SLUG } });

api.interceptors.request.use((config) => {
  let token = null; try { token = window.localStorage.getItem('token'); } catch { /* noop */ }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Frontend-Page'] = window.location.pathname;
  const originalUrl = String(config?.url || '');
  if (String(config?.method || '').toLowerCase() === 'post' && originalUrl.split('?')[0] === '/laora/swipes') config.__peterSwipeAction = config?.data?.action;
  config.url = canonicalConnectionUrl(originalUrl);
  if (isMultipartUpload(config) && (!config.timeout || config.timeout === DEFAULT_TIMEOUT_MS)) config.timeout = UPLOAD_TIMEOUT_MS;
  if (isVerificationResend(config)) {
    if (verificationResendInFlight) return Promise.reject(new Error('O reenvio do código já está em andamento.'));
    const now = Date.now(); const remainingMs = VERIFICATION_RESEND_COOLDOWN_MS - (now - getLastVerificationResendAt());
    if (remainingMs > 0) return Promise.reject(new Error(`Aguarde ${Math.ceil(remainingMs / 1000)} segundos para reenviar o código.`));
    verificationResendInFlight = true; config.__peterVerificationResend = true;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response?.config?.__peterVerificationResend) { verificationResendInFlight = false; setLastVerificationResendAt(Date.now()); }
    try { funnelEventsFor(response).forEach(([type, funnel, dedupe]) => recordFunnelEvent(type, funnel, dedupe)); } catch { /* noop */ }
    return response;
  },
  async (error) => {
    const config = error?.config; const status = error?.response?.status; const method = String(config?.method || '').toLowerCase(); const transientFailure = !error?.response || status === 408 || status === 429 || status >= 500;
    if (config?.__peterVerificationResend) { verificationResendInFlight = false; if (status === 429) setLastVerificationResendAt(Date.now()); }
    if (config && method === 'get' && transientFailure && !config.__peterRetried) {
      config.__peterRetried = true;
      const retryAfterSeconds = Number(error?.response?.headers?.['retry-after']);
      const retryDelayMs = status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.min(retryAfterSeconds * 1000, 5000) : 350;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
      return api.request(config);
    }
    if (status === 401 && !String(config?.url || '').includes('/auth/login')) { try { ['token', 'access_token', 'auth_token', 'user'].forEach((key) => window.localStorage.removeItem(key)); } catch { /* noop */ } window.dispatchEvent(new Event('authChanged')); }
    return Promise.reject(error);
  },
);

export default api;