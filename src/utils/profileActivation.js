import { recordFunnelEvent } from '../services/api';

const HOST_ATTR = 'data-laora-profile-activation';
const COMPLETE_EVENT_KEY = 'peter:laora:profile-activation-complete';

function requiredFields(form) {
  return Array.from(form.querySelectorAll('input[required], select[required], textarea[required]'));
}

function isFilled(field) {
  if (field.type === 'checkbox' || field.type === 'radio') return field.checked;
  return String(field.value || '').trim().length > 0 && field.checkValidity();
}

function enhance(form) {
  if (!form || form.querySelector(`[${HOST_ATTR}]`)) return;

  const host = document.createElement('section');
  host.className = 'p-activation-progress';
  host.setAttribute(HOST_ATTR, 'true');
  host.setAttribute('aria-live', 'polite');
  host.innerHTML = '<div><strong>Complete seu perfil para aparecer na descoberta</strong><span></span></div><progress max="100" value="0"></progress><button type="button" class="p-link">Continuar preenchimento</button>';

  const label = host.querySelector('span');
  const progress = host.querySelector('progress');
  const button = host.querySelector('button');

  const update = () => {
    const fields = requiredFields(form);
    const filled = fields.filter(isFilled).length;
    const percent = fields.length ? Math.round((filled / fields.length) * 100) : 100;
    progress.value = percent;
    label.textContent = `${percent}% concluído`;
    const missing = fields.find((field) => !isFilled(field));
    button.hidden = !missing;
    button.onclick = () => {
      missing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => missing?.focus({ preventScroll: true }), 350);
      recordFunnelEvent('activation_profile_recovery_clicked', 'activation');
    };

    if (percent === 100) {
      host.classList.add('complete');
      try {
        if (!sessionStorage.getItem(COMPLETE_EVENT_KEY)) {
          sessionStorage.setItem(COMPLETE_EVENT_KEY, '1');
          recordFunnelEvent('activation_profile_required_fields_completed', 'activation');
        }
      } catch { /* Activation guidance must remain best-effort. */ }
    } else host.classList.remove('complete');
  };

  form.prepend(host);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

export function installProfileActivationGuide() {
  if (typeof document === 'undefined') return () => {};
  const scan = () => document.querySelectorAll('form.p-form').forEach(enhance);
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
