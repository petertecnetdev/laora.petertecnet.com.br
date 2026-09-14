import { recordFunnelEvent } from '../services/api';

const HOST_ATTR = 'data-laora-profile-activation';
const COMPLETE_EVENT_KEY = 'peter:laora:profile-activation-complete';
const HANDOFF_EVENT_KEY = 'peter:laora:profile-activation-handoff';
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

function activationSteps(form) {
  const page = form.closest('.p-page') || document;
  const required = requiredFields(form);
  const requiredReady = required.every((field) => isFilled(field, form));
  const approvedPhoto = Boolean(page.querySelector('.p-photo .p-status.approved'));
  const locationReady = Boolean(page.querySelector('.p-location span')?.textContent?.includes('configurada'));
  const preferenceReady = Boolean(Array.from(form.querySelectorAll('.p-chips button.active')).length);

  return [
    { ready: requiredReady, label: 'Preencha os campos obrigatórios', target: required.find((field) => !isFilled(field, form)) },
    { ready: approvedPhoto, label: 'Tenha ao menos uma foto aprovada', target: page.querySelector('.p-photo-grid') },
    { ready: locationReady, label: 'Configure sua localização protegida', target: page.querySelector('.p-location button') },
    { ready: preferenceReady, label: 'Escolha quem você quer conhecer', target: Array.from(form.querySelectorAll('.p-label')).find((node) => node.textContent?.includes('Quero conhecer')) },
  ];
}

function focusStep(step) {
  step?.target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => step?.target?.focus?.({ preventScroll: true }), 350);
  recordFunnelEvent('activation_profile_recovery_clicked', 'activation');
}

function openDiscovery(source = 'manual') {
  const discoveryButton = Array.from(document.querySelectorAll('.p-top nav button')).find(
    (button) => button.textContent?.includes('Descobrir'),
  );
  if (!discoveryButton) return false;
  recordFunnelEvent(source === 'saved_profile' ? 'activation_discovery_handoff_automatic' : 'activation_discovery_handoff_clicked', 'activation');
  discoveryButton.click();
  window.scrollTo?.({ top: 0, behavior: 'smooth' });
  return true;
}

function installSavedProfileHandoff(form) {
  form.addEventListener('submit', () => {
    let stopped = false;
    const stop = () => { stopped = true; observer.disconnect(); window.clearTimeout(timeout); };
    const tryHandoff = () => {
      if (stopped || !document.body.contains(form)) return;
      const saved = Array.from(document.querySelectorAll('.p-toast')).some((toast) => toast.textContent?.includes('Perfil salvo'));
      const complete = activationSteps(form).every((step) => step.ready);
      if (!saved || !complete) return;
      try {
        if (sessionStorage.getItem(HANDOFF_EVENT_KEY)) { stop(); return; }
        sessionStorage.setItem(HANDOFF_EVENT_KEY, '1');
      } catch { /* Handoff remains best-effort when storage is unavailable. */ }
      if (openDiscovery('saved_profile')) stop();
    };
    const observer = new MutationObserver(tryHandoff);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    const timeout = window.setTimeout(stop, 15000);
    tryHandoff();
  });
}

function enhance(form) {
  if (!form || form.querySelector(`[${HOST_ATTR}]`)) return;

  const host = document.createElement('section');
  host.className = 'p-activation-progress';
  host.setAttribute(HOST_ATTR, 'true');
  host.setAttribute('aria-live', 'polite');
  host.innerHTML = '<div><strong>Prepare seu perfil para começar a descobrir pessoas</strong><span></span></div><progress max="100" value="0"></progress><button type="button" class="p-link">Continuar preenchimento</button>';

  const label = host.querySelector('span');
  const progress = host.querySelector('progress');
  const button = host.querySelector('button');

  const update = () => {
    const steps = activationSteps(form);
    const completed = steps.filter((step) => step.ready).length;
    const percent = Math.round((completed / steps.length) * 100);
    const missing = steps.find((step) => !step.ready);

    progress.value = percent;
    label.textContent = missing ? `${percent}% pronto · ${missing.label}` : '100% pronto para descoberta';
    button.hidden = false;
    button.textContent = missing ? 'Continuar preenchimento' : 'Começar a descobrir';
    button.onclick = missing ? () => focusStep(missing) : () => openDiscovery('manual');

    if (!missing) {
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
  installSavedProfileHandoff(form);

  const page = form.closest('.p-page');
  const observer = new MutationObserver(update);
  if (page) observer.observe(page, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
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
