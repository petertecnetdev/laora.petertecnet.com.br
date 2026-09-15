import { recordFunnelEvent } from '../services/api';

const SESSION_KEY = 'peter:laora:revenue-intent-exposed';

const markExposed = () => {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, '1');
    recordFunnelEvent('revenue_premium_interest_exposed', 'revenue', true);
  } catch { /* Revenue telemetry must never block the product. */ }
};

const isHighIntentSurface = () => Boolean(
  document.querySelector('.p-discover, .p-matches, .p-chat')
);

export const installRevenueIntentMeasurement = () => {
  const inspect = () => {
    if (!isHighIntentSurface()) return;
    markExposed();
  };

  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
      node instanceof Element && (
        node.matches('.p-discover, .p-matches, .p-chat')
        || node.querySelector('.p-discover, .p-matches, .p-chat')
      )
    ));
    if (relevant) inspect();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  inspect();
};
