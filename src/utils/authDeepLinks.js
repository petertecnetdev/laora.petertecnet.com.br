const REGISTER_PATH = '/register';

const buttonWithText = (root, text) => Array.from(root.querySelectorAll('button')).find(
  (button) => button.textContent?.trim() === text,
);

export const installAuthDeepLinks = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let registerActivated = false;

  const activateRegisterDeepLink = () => {
    if (window.location.pathname !== REGISTER_PATH || registerActivated) return;
    const authCard = document.querySelector('.p-auth-card');
    if (!authCard) return;
    const registerButton = buttonWithText(authCard, 'Criar uma conta');
    if (!registerButton) return;
    registerActivated = true;
    registerButton.click();
  };

  const observer = new MutationObserver(activateRegisterDeepLink);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  activateRegisterDeepLink();

  const onClick = (event) => {
    const button = event.target?.closest?.('.p-auth-card button');
    if (!button) return;
    const label = button.textContent?.trim();
    if (label === 'Criar uma conta' && window.location.pathname !== REGISTER_PATH) {
      window.history.pushState({}, '', REGISTER_PATH + window.location.search + window.location.hash);
      registerActivated = true;
    } else if (label === 'Voltar para o login' && window.location.pathname === REGISTER_PATH) {
      window.history.replaceState({}, '', '/' + window.location.search + window.location.hash);
      registerActivated = false;
    }
  };

  document.addEventListener('click', onClick);
  return () => {
    observer.disconnect();
    document.removeEventListener('click', onClick);
  };
};
