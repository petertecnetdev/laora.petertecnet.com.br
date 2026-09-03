const STYLE_ID = 'pt-password-visibility-style';
const BUTTON_CLASS = 'pt-password-visibility-toggle';
const HOST_CLASS = 'pt-password-visibility-host';
const INPUT_CLASS = 'pt-password-visibility-input';

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${HOST_CLASS} { position: relative !important; }
    .${HOST_CLASS} > .${INPUT_CLASS} { padding-right: 5.7rem !important; }
    .${BUTTON_CLASS} {
      position: absolute;
      z-index: 5;
      right: 7px;
      bottom: 7px;
      min-width: 68px;
      min-height: 34px;
      padding: 0 9px;
      border: 1px solid rgba(139, 92, 246, .32);
      border-radius: 10px;
      background: rgba(7, 16, 31, .92);
      color: #d9d0ff;
      font: inherit;
      font-size: .74rem;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      transition: border-color .18s ease, background .18s ease, color .18s ease;
    }
    .${BUTTON_CLASS}:hover { border-color: rgba(196, 181, 253, .72); background: rgba(139, 92, 246, .15); color: #fff; }
    .${BUTTON_CLASS}:focus-visible { outline: 2px solid rgba(196, 181, 253, .9); outline-offset: 2px; }
    @media (max-width: 620px) {
      .${HOST_CLASS} > .${INPUT_CLASS} { padding-right: 5.35rem !important; }
      .${BUTTON_CLASS} { min-width: 64px; right: 6px; bottom: 6px; padding-inline: 8px; font-size: .71rem; }
    }
  `;
  document.head.appendChild(style);
};

const enhanceInput = (input) => {
  if (!(input instanceof HTMLInputElement) || input.dataset.passwordVisibilityReady === 'true') return;
  const host = input.parentElement;
  if (!host) return;

  input.dataset.passwordVisibilityReady = 'true';
  input.classList.add(INPUT_CLASS);
  host.classList.add(HOST_CLASS);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.setAttribute('aria-pressed', 'false');

  const syncLabel = () => {
    const visible = input.type === 'text';
    const label = visible ? 'Ocultar senha' : 'Mostrar senha';
    button.textContent = visible ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(visible));
  };

  button.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    syncLabel();
    input.focus({ preventScroll: true });
  });

  syncLabel();
  host.appendChild(button);
};

export const installPasswordVisibilityToggles = ({ selector = 'input[type="password"]' } = {}) => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};

  ensureStyles();

  const scan = () => {
    document.querySelectorAll(selector).forEach(enhanceInput);
  };

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
};
