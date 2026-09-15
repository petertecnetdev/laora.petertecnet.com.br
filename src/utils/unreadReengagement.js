const UNREAD_TITLE_MARKER = ' · Laora';
const UNREAD_NOTIFICATION_TAG = 'laora-unread-messages';
const MATCHES_DEEP_LINK_PARAM = 'laora';
const MATCHES_DEEP_LINK_VALUE = 'matches';

const readUnreadCount = (root = document) => {
  const navButtons = [...root.querySelectorAll('.p-top nav button')];
  const matchesButton = navButtons.find((button) => button.textContent?.includes('Matches'));
  const badge = matchesButton?.querySelector('b');
  const count = Number.parseInt(badge?.textContent || '0', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const isUnreadTitle = (title) => /^\(\d+\) (?:nova mensagem|novas mensagens) · Laora$/.test(title);

const prioritizeUnreadMatches = () => {
  const grid = document.querySelector('.p-match-grid');
  if (!grid) return;

  const cards = [...grid.querySelectorAll(':scope > .p-match')];
  if (cards.length < 2) return;

  const unread = cards.filter((card) => card.querySelector('.p-badge'));
  if (!unread.length) return;

  const read = cards.filter((card) => !card.querySelector('.p-badge'));
  const desired = [...unread, ...read];
  if (desired.every((card, index) => cards[index] === card)) return;

  desired.forEach((card) => grid.appendChild(card));
};

const notifyUnreadIncrease = async (unread, previousUnread) => {
  if (!document.hidden || previousUnread === null || unread <= previousUnread) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Nova mensagem na Laora', {
      body: unread === 1
        ? 'Você recebeu uma nova mensagem.'
        : `Você tem ${unread} mensagens não lidas.`,
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      tag: UNREAD_NOTIFICATION_TAG,
      renotify: true,
      data: { url: `/?${MATCHES_DEEP_LINK_PARAM}=${MATCHES_DEEP_LINK_VALUE}` },
    });
  } catch {
    // Notification failures must never interfere with chat or navigation.
  }
};

export const installUnreadReengagement = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let frame = null;
  let navObserver = null;
  let observedNav = null;
  let bootstrapObserver = null;
  let matchObserver = null;
  let baseTitle = document.title;
  let previousUnread = null;

  const openRequestedMatches = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(MATCHES_DEEP_LINK_PARAM) !== MATCHES_DEEP_LINK_VALUE) return false;
    const matchesButton = [...document.querySelectorAll('.p-top nav button')]
      .find((button) => button.textContent?.includes('Matches'));
    if (!matchesButton) return false;
    matchesButton.click();
    params.delete(MATCHES_DEEP_LINK_PARAM);
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    return true;
  };

  const applyUnreadTitle = () => {
    const unread = readUnreadCount();
    const currentTitle = document.title;

    // Keep route/SEO context if another part of the SPA changed the page title.
    if (!isUnreadTitle(currentTitle)) baseTitle = currentTitle;

    void notifyUnreadIncrease(unread, previousUnread);
    previousUnread = unread;

    document.title = unread > 0
      ? `(${unread}) ${unread === 1 ? 'nova mensagem' : 'novas mensagens'}${UNREAD_TITLE_MARKER}`
      : baseTitle;
  };

  const schedule = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      applyUnreadTitle();
      prioritizeUnreadMatches();
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
    openRequestedMatches();
    schedule();
    return true;
  };

  const bootstrapNavigation = () => {
    navObserver?.disconnect();
    navObserver = null;
    observedNav = null;
    bootstrapObserver?.disconnect();
    bootstrapObserver = null;
    previousUnread = null;

    if (!isUnreadTitle(document.title)) baseTitle = document.title;

    if (!observeNavigation()) {
      bootstrapObserver = new MutationObserver(observeNavigation);
      bootstrapObserver.observe(document.body, { childList: true, subtree: true });
    }
    schedule();
  };

  matchObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === 'childList')) schedule();
  });
  matchObserver.observe(document.body, { childList: true, subtree: true });

  bootstrapNavigation();
  window.addEventListener('authChanged', bootstrapNavigation);
  document.addEventListener('visibilitychange', schedule);

  return () => {
    navObserver?.disconnect();
    bootstrapObserver?.disconnect();
    matchObserver?.disconnect();
    window.removeEventListener('authChanged', bootstrapNavigation);
    document.removeEventListener('visibilitychange', schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    if (isUnreadTitle(document.title)) document.title = baseTitle;
  };
};
