import { recordFunnelEvent } from '../services/api';

const HOST_ATTR = 'data-laora-profile-activation';
const COMPLETE_EVENT_KEY = 'peter:laora:profile-activation-complete';
const PROFILE_FORM_SELECTOR = 'form.p-form';

function requiredFields(form) {
  const fields = Array.from(form.querySelectorAll('input[required], select[required], textarea[required]'));
  const seenRadioGroups = new Set();

  return fields.filter((field) => {
    if (field.type !== 'radio' || !field.name) return true;
    if (seenRadioGroups.has(field.name)) return false;
    seenRadioGroups.add(field.name);
    return true;
  });
}

function isFilled(field, form) {
  if (field.type === 'radio' && field.name) {
    const group = form.elements.namedItem(field.name);
    if (!group) return false;
    if (typeof group.length !== 'number') return Boolean(group.checked);
    return Array.from(group).some((option) => option.checked);
  }
  if (field.type === 'checkbox') return field.checked;
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
    const filled = fields.filter((field) => isFilled(field, form)).length;
    const percent = fields.length ? Math.round((filled / fields.length) * 100) : 100;
    progress.value = percent;
    label.textContent = `${percent}% concluído`;
    const missing = fields.find((field) => !isFilled(field, form));
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

function enhanceAddedNode(node) {
  if (!(node instanceof Element)) return;
  if (node.matches(PROFILE_FORM_SELECTOR)) enhance(node);
  node.querySelectorAll?.(PROFILE_FORM_SELECTOR).forEach(enhance);
}

export function installProfileActivationGuide() {
  if (typeof document === 'undefined') return () => {};
  document.querySelectorAll(PROFILE_FORM_SELECTOR).forEach(enhance);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(enhanceAddedNode));
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
