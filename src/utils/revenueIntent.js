import api, { recordFunnelEvent } from '../services/api';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const SESSION_KEY = `peter:${APP_SLUG}:revenue-intent-exposed`;
const INTEREST_KEY = `peter:${APP_SLUG}:premium-interest`;
const CTA_ID = `${APP_SLUG}-premium-interest-cta`;
let offerPromise = null;

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

const formatPrice = (plan) => {
  const value = Number(plan?.price);
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: plan?.currency || 'BRL',
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }
};

const intervalLabel = (plan) => {
  const count = Number(plan?.billing_interval_count) || 1;
  const labels = { day: 'dia', week: 'semana', month: 'mês', year: 'ano' };
  const unit = labels[plan?.billing_interval];
  if (!unit) return '';
  return count === 1 ? `/${unit}` : ` a cada ${count} ${unit}${count > 1 && unit !== 'mês' ? 's' : ''}`;
};

const loadOffer = async () => {
  if (offerPromise) return offerPromise;
  offerPromise = api.get(`/v1/apps/${encodeURIComponent(APP_SLUG)}/billing/plans`)
    .then((response) => {
      const plans = Array.isArray(response?.data?.data) ? response.data.data : [];
      return plans.find((plan) => Number(plan?.price) > 0) || null;
    })
    .catch(() => null);
  return offerPromise;
};

const ensureInterestCta = async () => {
  if (safeSessionGet(INTEREST_KEY) || document.getElementById(CTA_ID)) return;
  const surface = document.querySelector('.p-discover, .p-matches, .p-chat');
  if (!surface) return;

  const button = document.createElement('button');
  button.id = CTA_ID;
  button.type = 'button';
  button.className = 'btn btn-outline-primary btn-sm';
  button.textContent = 'Quero conhecer o Premium';
  button.setAttribute('aria-label', 'Conhecer a oferta Premium');
  button.style.cssText = 'display:block;margin:12px auto;max-width:300px;width:calc(100% - 32px);';
  surface.prepend(button);

  const plan = await loadOffer();
  if (!button.isConnected) return;
  const price = formatPrice(plan);
  if (plan && price) {
    button.textContent = `${plan.name || 'Premium'} · ${price}${intervalLabel(plan)}`;
    button.setAttribute('aria-label', `Conhecer ${plan.name || 'Premium'} por ${price}`);
    recordFunnelEvent('revenue_premium_offer_exposed', 'revenue', true);
  }

  button.addEventListener('click', () => {
    safeSessionSet(INTEREST_KEY, '1');
    recordFunnelEvent(plan ? 'revenue_premium_offer_clicked' : 'revenue_premium_interest_clicked', 'revenue', true);
    button.textContent = plan ? 'Oferta registrada' : 'Interesse registrado';
    button.disabled = true;
    window.setTimeout(() => button.remove(), 1800);
  }, { once: true });
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
