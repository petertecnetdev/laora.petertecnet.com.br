const PROTECTED_LABELS = new Set(['descobrir', 'matches']);

const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR');

export const installVerificationGate = () => {
  if (typeof document === 'undefined') return () => {};

  const onClick = (event) => {
    const button = event.target.closest?.('.p-top nav button');
    if (!button || !PROTECTED_LABELS.has(normalize(button.textContent).replace(/\s+\d+$/, ''))) return;

    const verification = document.querySelector('.p-verify');
    if (!verification) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    verification.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const input = verification.querySelector('input');
    window.setTimeout(() => input?.focus({ preventScroll: true }), 350);
  };

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
};
