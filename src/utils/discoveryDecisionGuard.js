const CARD_SELECTOR = '.p-dating-card';
const ACTION_SELECTOR = '.p-pass, .p-like';
const ERROR_TOAST_SELECTOR = '.p-toast.error';
const LOCK_ATTR = 'data-laora-decision-pending';
const LOCK_TIMEOUT_MS = 15000;

export function installDiscoveryDecisionGuard() {
  let lockedCard = null;
  let timer = null;

  const unlock = () => {
    window.clearTimeout(timer);
    timer = null;
    if (!lockedCard) return;
    lockedCard.removeAttribute(LOCK_ATTR);
    lockedCard.querySelectorAll(ACTION_SELECTOR).forEach((button) => {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    });
    lockedCard = null;
  };

  const onClick = (event) => {
    const button = event.target.closest?.(ACTION_SELECTOR);
    if (!button) return;
    const card = button.closest(CARD_SELECTOR);
    if (!card) return;

    if (card.hasAttribute(LOCK_ATTR)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    card.setAttribute(LOCK_ATTR, '1');
    lockedCard = card;
    queueMicrotask(() => {
      if (lockedCard !== card || !document.body.contains(card)) return;
      card.querySelectorAll(ACTION_SELECTOR).forEach((action) => {
        action.disabled = true;
        action.setAttribute('aria-busy', 'true');
      });
    });
    timer = window.setTimeout(unlock, LOCK_TIMEOUT_MS);
  };

  const observer = new MutationObserver((mutations) => {
    if (!lockedCard) return;
    if (!document.body.contains(lockedCard)) { unlock(); return; }

    const hasDecisionError = mutations.some((mutation) => [...mutation.addedNodes].some((node) => (
      node.nodeType === Node.ELEMENT_NODE
      && (node.matches?.(ERROR_TOAST_SELECTOR) || node.querySelector?.(ERROR_TOAST_SELECTOR))
    )));
    if (hasDecisionError) unlock();
  });

  document.addEventListener('click', onClick, true);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    document.removeEventListener('click', onClick, true);
    observer.disconnect();
    unlock();
  };
}
