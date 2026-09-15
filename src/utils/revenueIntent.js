import { recordFunnelEvent } from '../services/api';

const SESSION_KEY = 'peter:laora:revenue-intent-exposed';
const INTEREST_KEY = 'peter:laora:premium-interest';
const CTA_ID = 'laora-premium-interest-cta';

const safeSessionGet = (key) => {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
};

const safeSessionSet = (key, value) => {
  try { window.sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ }
};

const markExposed = () => {
  if (safeSessionGet(SESSION_KEY)) return;
  safeSessionSet(SESSION_KEY, '1');
  recordFunnelEvent('revenue_premium_interest_exposed', 'revenue', true);
};

const ensureInterestCta = () => {
  if (safeSessionGet(INTEREST_KEY) || document.getElementById(CTA_ID)) return;
  const surface = document.querySelector('.p-discover, .p-matches, .p-chat');
  if (!surface) return;

  const button = document.createElement('button');
  button.id = CTA_ID;
  button.type = 'button';
  button.className = 'btn btn-outline-primary btn-sm';
  button.textContent = 'Quero conhecer o Premium';
  button.setAttribute('aria-label', 'Registrar interesse no Laora Premium');
  button.style.cssText = 'display:block;margin:12px auto;max-width:260px;width:calc(100% - 32px);';
  button.addEventListener('click', () => {
    safeSessionSet(INTEREST_KEY, '1');
    recordFunnelEvent('revenue_premium_interest_clicked', 'revenue', true);
    button.textContent = 'Interesse registrado';
    button.disabled = true;
    window.setTimeout(() => button.remove(), 1800);
  }, { once: true });
  surface.prepend(button);
};

const isHighIntentSurface = () => Boolean(
  document.querySelector('.p-discover, .p-matches, .p-chat')
);

export const installRevenueIntentMeasurement = () => {
  const inspect = () => {
    if (!isHighIntentSurface()) return;
    markExposed();
    ensureInterestCta();
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
