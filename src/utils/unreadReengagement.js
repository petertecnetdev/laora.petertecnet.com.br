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
  let observedNav = null;
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
    if (!nav) return false;
    if (navObserver && observedNav === nav) return true;

    navObserver?.disconnect();
    navObserver = new MutationObserver(schedule);
    navObserver.observe(nav, { childList: true, subtree: true, characterData: true });
    observedNav = nav;
    bootstrapObserver?.disconnect();
    bootstrapObserver = null;
    schedule();
    return true;
  };

  const bootstrapNavigation = () => {
    navObserver?.disconnect();
    navObserver = null;
    observedNav = null;
    bootstrapObserver?.disconnect();
    bootstrapObserver = null;

    if (!observeNavigation()) {
      bootstrapObserver = new MutationObserver(observeNavigation);
      bootstrapObserver.observe(document.body, { childList: true, subtree: true });
    }
    schedule();
  };

  bootstrapNavigation();
  window.addEventListener('authChanged', bootstrapNavigation);
  document.addEventListener('visibilitychange', schedule);

  return () => {
    navObserver?.disconnect();
    bootstrapObserver?.disconnect();
    window.removeEventListener('authChanged', bootstrapNavigation);
    document.removeEventListener('visibilitychange', schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    document.title = BASE_TITLE;
  };
};
