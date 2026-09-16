import api, { recordFunnelEvent } from '../services/api';

const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const SESSION_KEY = `peter:${APP_SLUG}:revenue-intent-exposed`;
const CTA_ID = `${APP_SLUG}-premium-interest-cta`;
const PIX_DIALOG_ID = `${APP_SLUG}-premium-pix-dialog`;
let offerPromise = null;
let checkoutBusy = false;

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

const idempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const showPixDialog = (qrCode) => {
  document.getElementById(PIX_DIALOG_ID)?.remove();

  const backdrop = document.createElement('div');
  backdrop.id = PIX_DIALOG_ID;
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', `${PIX_DIALOG_ID}-title`);
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,8,18,.78);backdrop-filter:blur(8px);';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:min(100%,460px);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:22px;background:#101525;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.45);';

  const title = document.createElement('h2');
  title.id = `${PIX_DIALOG_ID}-title`;
  title.textContent = 'PIX pronto para pagamento';
  title.style.cssText = 'margin:0 0 8px;font-size:1.2rem;';

  const hint = document.createElement('p');
  hint.textContent = 'Copie o código abaixo, abra o aplicativo do seu banco e use PIX Copia e Cola.';
  hint.style.cssText = 'margin:0 0 14px;opacity:.78;line-height:1.45;';

  const code = document.createElement('textarea');
  code.value = qrCode;
  code.readOnly = true;
  code.setAttribute('aria-label', 'Código PIX Copia e Cola');
  code.style.cssText = 'width:100%;min-height:112px;resize:none;border-radius:12px;border:1px solid rgba(255,255,255,.16);padding:12px;background:#080c17;color:#fff;font:12px/1.45 monospace;box-sizing:border-box;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:10px;margin-top:14px;';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-primary';
  copy.textContent = 'Copiar código PIX';
  copy.style.cssText = 'flex:1;';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn btn-outline-light';
  close.textContent = 'Fechar';

  const copyCode = async () => {
    code.focus();
    code.select();
    try {
      await navigator.clipboard?.writeText?.(qrCode);
      copy.textContent = 'Código copiado';
      recordFunnelEvent('revenue_premium_pix_code_copied', 'revenue', true);
    } catch {
      copy.textContent = 'Código selecionado — copie';
    }
  };

  copy.addEventListener('click', copyCode);
  close.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') backdrop.remove();
  });

  actions.append(copy, close);
  panel.append(title, hint, code, actions);
  backdrop.append(panel);
  document.body.append(backdrop);
  copy.focus();
};

const exposePixCode = async (qrCode) => {
  if (!qrCode) return false;
  showPixDialog(qrCode);
  try {
    await navigator.clipboard?.writeText?.(qrCode);
  } catch { /* The dialog always keeps the PIX code selectable. */ }
  return true;
};

const checkoutPremium = async (plan, button) => {
  if (!plan?.code || checkoutBusy) return;
  checkoutBusy = true;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Gerando PIX…';
  recordFunnelEvent('revenue_premium_checkout_started', 'revenue', true);

  try {
    const intentKey = idempotencyKey();
    const intentResponse = await api.post(
      `/v1/apps/${encodeURIComponent(APP_SLUG)}/subscription-intents`,
      { plan_code: plan.code, source: 'premium_offer', handoff_channel: 'web' },
      { headers: { 'Idempotency-Key': intentKey } },
    );
    const intent = intentResponse?.data?.data;
    if (!intent?.id) throw new Error('Não foi possível iniciar a assinatura.');

    const checkoutResponse = await api.post(
      `/v1/apps/${encodeURIComponent(APP_SLUG)}/subscription-intents/${encodeURIComponent(intent.id)}/checkout`,
      { method: 'pix' },
      { headers: { 'Idempotency-Key': idempotencyKey() } },
    );
    const checkout = checkoutResponse?.data;
    const payment = checkout?.payment || checkout?.data?.payment || checkout;
    const pix = payment?.pix || checkout?.pix || checkout?.data?.payment?.pix || {};
    const ticketUrl = pix?.ticket_url || payment?.ticket_url || checkout?.ticket_url;
    const qrCode = pix?.qr_code || payment?.qr_code || checkout?.qr_code;

    recordFunnelEvent('revenue_premium_pix_created', 'revenue', true);
    if (ticketUrl) {
      window.location.assign(ticketUrl);
      return;
    }
    if (await exposePixCode(qrCode)) {
      recordFunnelEvent('revenue_premium_pix_code_exposed', 'revenue', true);
      button.textContent = 'PIX pronto — conclua no seu banco';
      window.setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
        checkoutBusy = false;
      }, 6000);
      return;
    }
    throw new Error('PIX criado, mas o código de pagamento não foi retornado.');
  } catch (error) {
    recordFunnelEvent('revenue_premium_checkout_failed', 'revenue', false);
    const message = error?.response?.data?.message || error?.message || 'Não foi possível gerar o PIX. Tente novamente.';
    button.textContent = message.length <= 54 ? message : 'Não foi possível gerar o PIX. Tente novamente.';
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
      checkoutBusy = false;
    }, 4500);
  }
};

const ensureInterestCta = async () => {
  if (document.getElementById(CTA_ID)) return;
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
    button.textContent = `${plan.name || 'Premium'} · ${price}${intervalLabel(plan)} · pagar com PIX`;
    button.setAttribute('aria-label', `Assinar ${plan.name || 'Premium'} por ${price} via PIX`);
    recordFunnelEvent('revenue_premium_offer_exposed', 'revenue', true);
  }

  button.addEventListener('click', () => {
    recordFunnelEvent(plan ? 'revenue_premium_offer_clicked' : 'revenue_premium_interest_clicked', 'revenue', true);
    if (plan) {
      checkoutPremium(plan, button);
      return;
    }
    button.textContent = 'Oferta temporariamente indisponível';
    button.disabled = true;
    window.setTimeout(() => button.remove(), 2500);
  });
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