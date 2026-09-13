const BASE_TITLE = 'Laora | App de relacionamento grátis e conexões reais';
const UNREAD_EVENT = 'laora:unread-count';

let unreadCount = 0;

const normalizeUnreadCount = (value) => {
  const count = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const applyUnreadTitle = () => {
  document.title = unreadCount > 0
    ? `(${unreadCount}) ${unreadCount === 1 ? 'nova mensagem' : 'novas mensagens'} · Laora`
    : BASE_TITLE;
};

export const publishUnreadCount = (value) => {
  unreadCount = normalizeUnreadCount(value);
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: { count: unreadCount } }));
};

export const installUnreadReengagement = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const onUnreadCount = (event) => {
    unreadCount = normalizeUnreadCount(event?.detail?.count);
    applyUnreadTitle();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') applyUnreadTitle();
  };

  window.addEventListener(UNREAD_EVENT, onUnreadCount);
  document.addEventListener('visibilitychange', onVisibilityChange);
  applyUnreadTitle();

  return () => {
    window.removeEventListener(UNREAD_EVENT, onUnreadCount);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.title = BASE_TITLE;
  };
};
