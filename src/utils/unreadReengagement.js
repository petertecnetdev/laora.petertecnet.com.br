const BASE_TITLE = 'Laora | App de relacionamento grátis e conexões reais';

const readUnreadCount = (root = document) => {
  const navButtons = [...root.querySelectorAll('.p-top nav button')];
  const matchesButton = navButtons.find((button) => button.textContent?.includes('Matches'));
  const badge = matchesButton?.querySelector('b');
  const count = Number.parseInt(badge?.textContent || '0', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const applyUnreadTitle = (root = document) => {
  const unread = readUnreadCount(root);
  document.title = unread > 0
    ? `(${unread}) ${unread === 1 ? 'nova mensagem' : 'novas mensagens'} · Laora`
    : BASE_TITLE;
};

export const installUnreadReengagement = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let frame = null;
  let navObserver = null;
  let bootstrapObserver = null;

  const schedule = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      applyUnreadTitle();
    });
  };

  const observeNavigation = () => {
    const nav = document.querySelector('.p-top nav');
    if (!nav || navObserver) return false;

    navObserver = new MutationObserver(schedule);
    navObserver.observe(nav, { childList: true, subtree: true, characterData: true });
    bootstrapObserver?.disconnect();
    bootstrapObserver = null;
    schedule();
    return true;
  };

  if (!observeNavigation()) {
    bootstrapObserver = new MutationObserver(observeNavigation);
    bootstrapObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('visibilitychange', schedule);
  schedule();

  return () => {
    navObserver?.disconnect();
    bootstrapObserver?.disconnect();
    document.removeEventListener('visibilitychange', schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    document.title = BASE_TITLE;
  };
};
