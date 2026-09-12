import { recordFunnelEvent } from '../services/api';

const INVITE_MARKER = 'data-laora-organic-invite';
const INVITE_URL = 'https://laora.petertecnet.com.br/?utm_source=laora&utm_medium=referral&utm_campaign=member_invite';

const copyInviteFallback = (text) => {
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.setAttribute('aria-hidden', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, input.value.length);
  const copied = document.execCommand?.('copy') === true;
  input.remove();
  if (!copied) throw new Error('Clipboard unavailable');
};

const copyInvite = async (text) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some installed PWAs and embedded browsers expose Clipboard but deny it.
    }
  }
  copyInviteFallback(text);
};

const shareInvite = async () => {
  const payload = {
    title: 'Laora — conexões reais',
    text: 'Conheça o Laora: um app para conhecer pessoas, dar match e conversar com segurança.',
    url: INVITE_URL,
  };
  const inviteText = `${payload.text} ${payload.url}`;

  try {
    if (navigator.share) {
      await navigator.share(payload);
      recordFunnelEvent('acquisition_referral_shared', 'acquisition', false);
      return;
    }

    // Desktop browsers frequently lack Web Share. Hand the invite directly to
    // WhatsApp Web instead of making the user copy, switch apps and paste.
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
    const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (whatsappWindow) {
      recordFunnelEvent('acquisition_referral_whatsapp_opened', 'acquisition', false);
      return;
    }

    // Popup blockers can reject window.open even from a click. Keep clipboard
    // as the final fallback so acquisition never depends on one browser API.
    await copyInvite(inviteText);
    recordFunnelEvent('acquisition_referral_copied', 'acquisition', false);
    window.dispatchEvent(new CustomEvent('laora:invite-copied'));
  } catch (error) {
    if (error?.name !== 'AbortError') {
      recordFunnelEvent('acquisition_referral_failed', 'acquisition', false);
      window.dispatchEvent(new CustomEvent('laora:invite-copy-failed'));
    }
  }
};

const enhanceEmptyDiscovery = () => {
  document.querySelectorAll('.p-empty').forEach((container) => {
    if (container.hasAttribute(INVITE_MARKER)) return;
    if (!container.textContent?.includes('Ninguém novo por enquanto')) return;

    container.setAttribute(INVITE_MARKER, '1');
    const hint = document.createElement('p');
    hint.textContent = 'Quanto mais gente da sua região entrar, maiores as chances de novas conexões.';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'p-button';
    button.textContent = 'Convidar alguém para o Laora';
    button.addEventListener('click', shareInvite);

    container.append(hint, button);
    recordFunnelEvent('acquisition_referral_prompt_viewed', 'acquisition', true);
  });
};

const showInviteToast = (message, type) => {
  const existing = document.querySelector('[data-laora-invite-toast]');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.dataset.laoraInviteToast = '1';
  toast.className = `p-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
};

export const installOrganicReferralLoop = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  enhanceEmptyDiscovery();
  const observer = new MutationObserver(enhanceEmptyDiscovery);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const copied = () => showInviteToast('Convite copiado. Compartilhe com alguém da sua região.', 'success');
  const copyFailed = () => showInviteToast('Não foi possível copiar o convite neste navegador.', 'error');
  window.addEventListener('laora:invite-copied', copied);
  window.addEventListener('laora:invite-copy-failed', copyFailed);
};
