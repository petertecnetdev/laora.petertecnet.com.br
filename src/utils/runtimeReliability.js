import { recordFunnelEvent } from '../services/api';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const ERROR_FLAG = `peter:${APP_SLUG}:runtime-error-recorded`;
const REJECTION_FLAG = `peter:${APP_SLUG}:runtime-rejection-recorded`;

function recordOnce(flag, type) {
  try {
    if (window.sessionStorage.getItem(flag) === '1') return;
    window.sessionStorage.setItem(flag, '1');
  } catch {
    // Telemetry storage is best-effort and must never affect availability.
  }

  recordFunnelEvent(type, 'reliability', false);
}

/**
 * Records browser-level failures that escape React/API handling.
 * No exception message, stack, URL or user input is transmitted here: the
 * signal is intentionally coarse so reliability can be measured without
 * leaking sensitive profile or conversation data.
 */
export function installRuntimeReliabilityTelemetry() {
  try {
    window.addEventListener('error', () => {
      recordOnce(ERROR_FLAG, 'reliability_runtime_error');
    });

    window.addEventListener('unhandledrejection', () => {
      recordOnce(REJECTION_FLAG, 'reliability_unhandled_rejection');
    });
  } catch {
    // Observability must never become a new failure mode.
  }
}
