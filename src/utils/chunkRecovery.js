const RECOVERY_KEY = 'peter:laora:chunk-recovery-at';
const RECOVERY_WINDOW_MS = 120000;

const messageFor = (value) => String(
  value?.message || value?.reason?.message || value?.reason || value || ''
).toLowerCase();

const isStaleChunkFailure = (value) => {
  const message = messageFor(value);
  return [
    'failed to fetch dynamically imported module',
    'importing a module script failed',
    'chunkloaderror',
    'loading chunk',
    'error loading dynamically imported module',
  ].some((pattern) => message.includes(pattern));
};

const recoverOnce = (value) => {
  if (!isStaleChunkFailure(value)) return;

  try {
    const lastRecoveryAt = Number(window.sessionStorage.getItem(RECOVERY_KEY) || 0);
    if (Number.isFinite(lastRecoveryAt) && Date.now() - lastRecoveryAt < RECOVERY_WINDOW_MS) return;
    window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // sessionStorage can be unavailable in restrictive browser modes; reload remains safe.
  }

  window.location.reload();
};

export const installChunkRecovery = () => {
  window.addEventListener('unhandledrejection', (event) => recoverOnce(event));
  window.addEventListener('error', (event) => recoverOnce(event));
};
