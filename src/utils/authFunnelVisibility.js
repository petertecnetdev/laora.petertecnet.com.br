import { recordFunnelEvent } from '../services/api';

const MODE_EVENT = {
  'Entrar no Laora': 'acquisition_login_viewed',
  'Criar conta': 'acquisition_registration_viewed',
  'Verificar e-mail': 'activation_verification_viewed',
  'Recuperar senha': 'recovery_password_viewed',
  'Criar nova senha': 'recovery_password_reset_viewed',
};

const SUBMIT_EVENT = {
  'Entrar no Laora': 'acquisition_login_attempted',
  'Criar conta': 'acquisition_registration_attempted',
  'Verificar e-mail': 'activation_verification_attempted',
  'Recuperar senha': 'recovery_password_requested',
  'Criar nova senha': 'recovery_password_reset_attempted',
};

const titleFor = (root) => root?.querySelector('.p-auth-card h2')?.textContent?.trim() || '';

const touchesAuth = (mutation) => {
  if (mutation.target instanceof Element && mutation.target.closest('.p-auth')) return true;
  return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
    node instanceof Element && (node.matches('.p-auth') || node.querySelector('.p-auth'))
  );
};

export const installAuthFunnelVisibility = () => {
  let lastMode = '';

  const inspect = () => {
    const root = document.querySelector('.p-auth');
    if (!root) {
      lastMode = '';
      return;
    }
    const mode = titleFor(root);
    if (!mode || mode === lastMode) return;
    lastMode = mode;
    const event = MODE_EVENT[mode];
    if (event) recordFunnelEvent(event, mode.startsWith('Recuperar') || mode.startsWith('Criar nova senha') ? 'recovery' : mode === 'Verificar e-mail' ? 'activation' : 'acquisition', true);
  };

  document.addEventListener('submit', (event) => {
    const form = event.target?.closest?.('.p-auth-card');
    if (!form) return;
    const mode = titleFor(document.querySelector('.p-auth'));
    const funnelEvent = SUBMIT_EVENT[mode];
    if (funnelEvent) recordFunnelEvent(funnelEvent, mode.startsWith('Recuperar') || mode.startsWith('Criar nova senha') ? 'recovery' : mode === 'Verificar e-mail' ? 'activation' : 'acquisition', false);
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('.p-auth')) return;
    window.setTimeout(inspect, 0);
  }, true);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(touchesAuth)) inspect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  inspect();
};