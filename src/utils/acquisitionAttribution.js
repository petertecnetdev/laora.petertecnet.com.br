import { recordFunnelEvent } from '../services/api';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const ATTRIBUTION_KEY = `peter:${APP_SLUG}:acquisition-attribution`;
const ALLOWED_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const MAX_VALUE_LENGTH = 160;
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function safeValue(value) {
  return String(value || '').trim().slice(0, MAX_VALUE_LENGTH);
}

function removeStoredAttribution() {
  try { window.localStorage.removeItem(ATTRIBUTION_KEY); }
  catch { /* Attribution cleanup must never block the product. */ }
}

export function readAcquisitionAttribution() {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      removeStoredAttribution();
      return null;
    }

    const capturedAt = Date.parse(parsed.captured_at || '');
    if (!Number.isFinite(capturedAt) || Date.now() - capturedAt > ATTRIBUTION_TTL_MS || capturedAt > Date.now() + 5 * 60 * 1000) {
      removeStoredAttribution();
      return null;
    }

    return parsed;
  } catch {
    removeStoredAttribution();
    return null;
  }
}

export function installAcquisitionAttribution() {
  try {
    // Expire stale or malformed attribution on every app bootstrap so old
    // campaigns cannot claim conversions indefinitely.
    readAcquisitionAttribution();

    const params = new URLSearchParams(window.location.search);
    const attribution = {};

    ALLOWED_UTM_KEYS.forEach((key) => {
      const value = safeValue(params.get(key));
      if (value) attribution[key] = value;
    });

    if (!Object.keys(attribution).length) return;

    const payload = {
      ...attribution,
      landing_path: window.location.pathname,
      captured_at: new Date().toISOString(),
    };

    try { window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(payload)); }
    catch { /* Attribution must never block acquisition or activation. */ }

    recordFunnelEvent('acquisition_attributed_landing', 'acquisition', true);
  } catch {
    // Attribution is best-effort and must never affect product availability.
  }
}
