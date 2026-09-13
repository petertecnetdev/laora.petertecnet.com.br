const BASE_TITLE = 'Laora | App de relacionamento grátis e conexões reais';

const readUnreadCount = () => {
  const navButtons = [...document.querySelectorAll('.p-top nav button')];
  const matchesButton = navButtons.find((button) => button.textContent?.includes('Matches'));
  const badge = matchesButton?.querySelector('b');
  const count = Number.parseInt(badge?.textContent || '0', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const applyUnreadTitle = () => {
  const unread = readUnreadCount();
  document.title = unread > 0
    ? `(${unread}) ${unread === 1 ? 'nova mensagem' : 'novas mensagens'} · Laora`
    : BASE_TITLE;
};

export const installUnreadReengagement = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let frame = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      applyUnreadTitle();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('visibilitychange', schedule);
  schedule();

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    document.title = BASE_TITLE;
  };
};
