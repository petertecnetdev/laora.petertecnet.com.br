const STYLE_ID = 'pt-password-field-enhancer-style';
const INSTALL_FLAG = '__ptPasswordFieldEnhancer';
const READY = 'data-pt-password-ready';
const GENERATED = 'data-pt-password-toggle';
let inputSequence = 0;

const icon = (visible) => visible
  ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.7 10.7 0 0112 4c5.5 0 9 5.5 9 5.5a15.8 15.8 0 01-2.5 3.2M6.6 6.7C4.4 8.1 3 10.5 3 10.5S6.5 16 12 16c1 0 2-.2 2.9-.5"/></svg>'
  : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.5"/></svg>';

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pt-password-host { position: relative !important; }
    .pt-password-host > input { padding-right: 3.25rem !important; }
    .pt-password-toggle {
      position: absolute; right: .45rem; z-index: 20; width: 2.35rem; height: 2.35rem; min-width: 2.35rem;
      padding: 0; display: grid; place-items: center; border: 1px solid rgba(148,163,184,.28);
      border-radius: .7rem; background: rgba(15,23,42,.82); color: inherit; cursor: pointer; line-height: 1; box-shadow: none;
    }
    .pt-password-toggle:hover { background: rgba(148,163,184,.14); }
    .pt-password-toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .pt-password-toggle svg, .pt-password-toggle-adopted svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
    .pt-password-toggle-adopted { width: 2.35rem !important; min-width: 2.35rem !important; height: 2.35rem !important; padding: 0 !important; display: grid !important; place-items: center !important; font-size: 0 !important; }
    .pt-password-meta { display: grid; gap: .35rem; margin-top: .4rem; font-size: .76rem; line-height: 1.35; }
    .pt-password-caps { color: #fbbf24; font-weight: 700; }
    .pt-password-requirements { display: flex; flex-wrap: wrap; gap: .28rem .55rem; color: inherit; opacity: .72; }
    .pt-password-requirements span::before { content: '○ '; }
    .pt-password-requirements span.ok { opacity: 1; }
    .pt-password-requirements span.ok::before { content: '✓ '; }
    .pt-password-strength { font-weight: 700; }
    .pt-password-strength[data-level="strong"] { color: #34d399; }
    .pt-password-strength[data-level="medium"] { color: #fbbf24; }
    .pt-password-strength[data-level="weak"] { color: #fb7185; }
    .pt-password-match { font-weight: 700; }
    .pt-password-match[data-match="true"] { color: #34d399; }
    .pt-password-match[data-match="false"] { color: #fb7185; }
  `;
  document.head.appendChild(style);
};

const findToggle = (host) => host.querySelector([
  `[${GENERATED}]`,
  '.password-visibility-toggle',
  '.pf-password-toggle',
  '.cut-login-form__passwordToggle',
  '.lfg__passwordToggle',
  'button[aria-pressed][type="button"]',
].join(','));

const ensureMeta = (host) => {
  let meta = host.nextElementSibling;
  if (!meta?.classList?.contains('pt-password-meta')) {
    meta = document.createElement('div');
    meta.className = 'pt-password-meta';
    host.insertAdjacentElement('afterend', meta);
  }
  return meta;
};

const syncButton = (button, visible) => {
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
  button.setAttribute('title', visible ? 'Ocultar senha' : 'Mostrar senha');
  button.innerHTML = icon(visible);
};

const adoptExistingToggle = (button) => {
  if (!button || button.hasAttribute(GENERATED) || button.dataset.ptPasswordAdopted === 'true') return;
  button.dataset.ptPasswordAdopted = 'true';
  button.classList.add('pt-password-toggle-adopted');
  const renderIcon = () => {
    const visible = button.getAttribute('aria-pressed') === 'true';
    const state = String(visible);
    if (button.dataset.ptPasswordIconState === state && button.querySelector('svg')) return;
    button.dataset.ptPasswordIconState = state;
    button.innerHTML = icon(visible);
  };
  const observer = new MutationObserver(renderIcon);
  observer.observe(button, { attributes: true, attributeFilter: ['aria-pressed'], childList: true, subtree: true });
  renderIcon();
};

const hidePassword = (input, toggle) => {
  if (input.type !== 'text') return;
  if (toggle?.hasAttribute(GENERATED)) {
    input.type = 'password';
    syncButton(toggle, false);
  } else if (toggle?.getAttribute('aria-pressed') === 'true') {
    toggle.click();
  }
};

const passwordRules = (value) => ({
  length: value.length >= 8,
  upper: /[A-Z]/.test(value),
  lower: /[a-z]/.test(value),
  number: /\d/.test(value),
  symbol: /[^A-Za-z0-9]/.test(value),
});

const enhanceInput = (input) => {
  if (!(input instanceof HTMLInputElement) || input.hasAttribute(READY)) return;
  input.setAttribute(READY, 'true');
  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('spellcheck', 'false');
  if (!input.id) input.id = `pt-password-${++inputSequence}`;

  const host = input.parentElement;
  if (!host) return;
  host.classList.add('pt-password-host');
  const meta = ensureMeta(host);

  let caps = meta.querySelector('.pt-password-caps');
  if (!caps) {
    caps = document.createElement('span');
    caps.className = 'pt-password-caps';
    caps.setAttribute('role', 'status');
    caps.setAttribute('aria-live', 'polite');
    caps.hidden = true;
    caps.textContent = 'Caps Lock ativado';
    meta.appendChild(caps);
  }

  let toggle = findToggle(host);
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pt-password-toggle';
    toggle.setAttribute(GENERATED, 'true');
    toggle.setAttribute('aria-controls', input.id);
    syncButton(toggle, false);
    toggle.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      syncButton(toggle, visible);
      input.focus({ preventScroll: true });
    });
    host.appendChild(toggle);
    const position = () => {
      const height = input.offsetHeight || 40;
      toggle.style.top = `${input.offsetTop + height / 2}px`;
      toggle.style.transform = 'translateY(-50%)';
    };
    position();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(position).observe(input);
  } else {
    adoptExistingToggle(toggle);
    if (!toggle.getAttribute('aria-controls')) toggle.setAttribute('aria-controls', input.id);
  }

  const updateCaps = (event) => { caps.hidden = !Boolean(event.getModifierState?.('CapsLock')); };
  input.addEventListener('keydown', updateCaps);
  input.addEventListener('keyup', updateCaps);
  input.addEventListener('blur', () => { caps.hidden = true; });
  host.addEventListener('focusout', () => window.setTimeout(() => {
    if (!host.contains(document.activeElement)) hidePassword(input, toggle);
  }, 0));

  if (input.autocomplete === 'new-password') {
    const form = input.closest('form') || input.closest('[role="dialog"]') || document.body;
    const inputs = Array.from(form.querySelectorAll('input[autocomplete="new-password"]'));
    const confirmation = inputs.indexOf(input) > 0 || /confirm|confirmation|repet|novamente/i.test(`${input.name} ${input.id} ${input.placeholder}`);

    if (!confirmation) {
      const requirements = document.createElement('div');
      requirements.className = 'pt-password-requirements';
      requirements.setAttribute('aria-label', 'Requisitos da senha');
      requirements.innerHTML = '<span data-rule="length">8+ caracteres</span><span data-rule="upper">maiúscula</span><span data-rule="lower">minúscula</span><span data-rule="number">número</span><span data-rule="symbol">símbolo</span>';
      const strength = document.createElement('span');
      strength.className = 'pt-password-strength';
      strength.setAttribute('role', 'status');
      strength.setAttribute('aria-live', 'polite');
      meta.append(requirements, strength);
      const updateRules = () => {
        const rules = passwordRules(input.value);
        Object.entries(rules).forEach(([rule, ok]) => requirements.querySelector(`[data-rule="${rule}"]`)?.classList.toggle('ok', ok));
        if (!input.value) { strength.textContent = ''; strength.removeAttribute('data-level'); return; }
        const score = Object.values(rules).filter(Boolean).length;
        const level = score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';
        strength.dataset.level = level;
        strength.textContent = level === 'strong' ? 'Senha forte.' : level === 'medium' ? 'Senha intermediária.' : 'Senha fraca.';
      };
      input.addEventListener('input', updateRules);
      updateRules();
    } else {
      const match = document.createElement('span');
      match.className = 'pt-password-match';
      match.setAttribute('role', 'status');
      match.setAttribute('aria-live', 'polite');
      meta.appendChild(match);
      const primary = inputs[0];
      const updateMatch = () => {
        if (!input.value) { match.textContent = ''; match.removeAttribute('data-match'); return; }
        const matches = input.value === primary?.value;
        match.dataset.match = String(matches);
        match.textContent = matches ? 'As senhas coincidem.' : 'As senhas ainda não coincidem.';
      };
      input.addEventListener('input', updateMatch);
      primary?.addEventListener('input', updateMatch);
      updateMatch();
    }
  }
};

const scan = (root = document) => {
  if (root instanceof HTMLInputElement && (root.type === 'password' || root.getAttribute('autocomplete')?.includes('password'))) enhanceInput(root);
  root.querySelectorAll?.('input[type="password"], input[autocomplete="new-password"], input[autocomplete="current-password"]').forEach(enhanceInput);
};

export const installPasswordVisibilityToggles = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  if (window[INSTALL_FLAG]?.cleanup) return window[INSTALL_FLAG].cleanup;
  ensureStyles();
  scan();
  const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node instanceof Element) scan(node);
  })));
  observer.observe(document.body, { childList: true, subtree: true });
  const cleanup = () => observer.disconnect();
  window[INSTALL_FLAG] = { cleanup };
  return cleanup;
};
