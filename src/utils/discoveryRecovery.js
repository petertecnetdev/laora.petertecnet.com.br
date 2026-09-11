import { DISCOVERY_RECOVERY_OPENED_KEY, recordFunnelEvent } from '../services/api';

const EMPTY_TITLE = 'Ninguém novo por enquanto';
const HOST_ATTR = 'data-laora-discovery-recovery';
const INVITE_CAMPAIGN = 'discovery_empty';
const INVITE_SOURCE_KEY = 'peter:laora:organic-invite-source';

function findEmptyDiscovery() {
  return Array.from(document.querySelectorAll('.p-empty')).find(
    (node) => node.querySelector('h2')?.textContent?.trim() === EMPTY_TITLE,
  );
}

function openProfileFilters() {
  const profileButton = Array.from(document.querySelectorAll('.p-top nav button')).find(
    (button) => button.textContent?.includes('Perfil'),
  );
  if (!profileButton) return;

  try { window.sessionStorage.setItem(DISCOVERY_RECOVERY_OPENED_KEY, '1'); }
  catch { /* Recovery continues even when storage is unavailable. */ }
  recordFunnelEvent('engagement_discovery_filters_opened', 'engagement');

  profileButton.click();
  window.setTimeout(() => {
    const distance = Array.from(document.querySelectorAll('.p-form label')).find(
      (label) => label.textContent?.includes('Distância'),
    )?.querySelector('input');
    distance?.focus({ preventScroll: true });
    distance?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 80);
}

function anonymousInviteSource() {
  try {
    let source = window.localStorage.getItem(INVITE_SOURCE_KEY);
    if (source && /^[a-z0-9-]{8,80}$/i.test(source)) return source;

    source = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(INVITE_SOURCE_KEY, source);
    return source;
  } catch {
    return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function inviteUrl() {
  const url = new URL(window.location.origin);
  url.searchParams.set('utm_source', 'laora');
  url.searchParams.set('utm_medium', 'member_invite');
  url.searchParams.set('utm_campaign', INVITE_CAMPAIGN);
  url.searchParams.set('utm_content', `member_${anonymousInviteSource()}`);
  return url.toString();
}

async function copyInvite(text, url) {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(`${text} ${url}`);
    recordFunnelEvent('acquisition_discovery_invite_copied', 'acquisition');
    return true;
  } catch {
    return false;
  }
}

async function invitePeople() {
  const url = inviteUrl();
  const text = 'Conheça a Laora, uma plataforma para conexões reais com matches transparentes e mais segurança.';
  const shareData = { title: 'Laora', text, url };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      recordFunnelEvent('acquisition_discovery_invite_shared', 'acquisition');
      return;
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (popup) {
      recordFunnelEvent('acquisition_discovery_invite_shared', 'acquisition');
      return;
    }

    await copyInvite(text, url);
  } catch (error) {
    if (error?.name !== 'AbortError') await copyInvite(text, url);
  }
}

function enhance() {
  const empty = findEmptyDiscovery();
  if (!empty || empty.querySelector(`[${HOST_ATTR}]`)) return;

  const host = document.createElement('div');
  host.setAttribute(HOST_ATTR, '1');
  host.className = 'p-discovery-recovery';

  const hint = document.createElement('p');
  hint.textContent = 'Você pode ampliar a distância ou a faixa etária para encontrar mais pessoas, sem alterar suas preferências de segurança.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'p-button';
  button.textContent = 'Ajustar filtros';
  button.addEventListener('click', openProfileFilters);

  const invite = document.createElement('button');
  invite.type = 'button';
  invite.className = 'p-button';
  invite.textContent = 'Convidar pessoas';
  invite.setAttribute('aria-label', 'Compartilhar a Laora e convidar novas pessoas');
  invite.addEventListener('click', invitePeople);

  host.append(hint, button, invite);
  empty.appendChild(host);
}

export function installDiscoveryRecovery() {
  let timer = null;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(enhance, 60);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();

  return () => {
    observer.disconnect();
    window.clearTimeout(timer);
    document.querySelector(`[${HOST_ATTR}]`)?.remove();
  };
}
