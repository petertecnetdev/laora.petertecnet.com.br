import { recordFunnelEvent } from '../services/api';

const INVITE_MARKER = 'data-laora-organic-invite';
const INVITE_URL = 'https://laora.petertecnet.com.br/?utm_source=laora&utm_medium=referral&utm_campaign=member_invite';

const shareInvite = async () => {
  const payload = {
    title: 'Laora — conexões reais',
    text: 'Conheça o Laora: um app para conhecer pessoas, dar match e conversar com segurança.',
    url: INVITE_URL,
  };

  try {
    if (navigator.share) {
      await navigator.share(payload);
      recordFunnelEvent('acquisition_referral_shared', 'acquisition', false);
      return;
    }

    await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
    recordFunnelEvent('acquisition_referral_copied', 'acquisition', false);
    window.dispatchEvent(new CustomEvent('laora:invite-copied'));
  } catch (error) {
    if (error?.name !== 'AbortError') {
      recordFunnelEvent('acquisition_referral_failed', 'acquisition', false);
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

export const installOrganicReferralLoop = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  enhanceEmptyDiscovery();
  const observer = new MutationObserver(enhanceEmptyDiscovery);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const copied = () => {
    const existing = document.querySelector('[data-laora-invite-toast]');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.dataset.laoraInviteToast = '1';
    toast.className = 'p-toast success';
    toast.textContent = 'Convite copiado. Compartilhe com alguém da sua região.';
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  };
  window.addEventListener('laora:invite-copied', copied);
};
