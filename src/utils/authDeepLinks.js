const REGISTER_PATH = '/register';

const buttonWithText = (root, text) => Array.from(root.querySelectorAll('button')).find(
  (button) => button.textContent?.trim() === text,
);

const notifyNavigation = () => window.dispatchEvent(new Event('laora:navigation'));

const normalizeAuthenticatedRoute = () => {
  if (window.location.pathname !== REGISTER_PATH || !localStorage.getItem('token')) return;
  window.history.replaceState({}, '', '/' + window.location.search + window.location.hash);
  notifyNavigation();
};

export const installAuthDeepLinks = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let registerActivated = false;

  const syncAuthViewWithLocation = () => {
    const authCard = document.querySelector('.p-auth-card');
    if (!authCard) return;

    if (window.location.pathname === REGISTER_PATH) {
      const registerButton = buttonWithText(authCard, 'Criar uma conta');
      if (!registerButton || registerActivated) return;
      registerActivated = true;
      registerButton.click();
      return;
    }

    const loginButton = buttonWithText(authCard, 'Voltar para o login');
    if (!loginButton) {
      registerActivated = false;
      return;
    }

    registerActivated = false;
    loginButton.click();
  };

  const observer = new MutationObserver(syncAuthViewWithLocation);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  normalizeAuthenticatedRoute();
  syncAuthViewWithLocation();

  const onClick = (event) => {
    const button = event.target?.closest?.('.p-auth-card button');
    if (!button) return;
    const label = button.textContent?.trim();
    if (label === 'Criar uma conta' && window.location.pathname !== REGISTER_PATH) {
      window.history.pushState({}, '', REGISTER_PATH + window.location.search + window.location.hash);
      registerActivated = true;
      notifyNavigation();
    } else if (label === 'Voltar para o login' && window.location.pathname === REGISTER_PATH) {
      window.history.replaceState({}, '', '/' + window.location.search + window.location.hash);
      registerActivated = false;
      notifyNavigation();
    }
  };

  const onPopState = () => {
    registerActivated = false;
    normalizeAuthenticatedRoute();
    syncAuthViewWithLocation();
  };

  const onAuthChanged = () => {
    registerActivated = false;
    normalizeAuthenticatedRoute();
  };

  document.addEventListener('click', onClick);
  window.addEventListener('popstate', onPopState);
  window.addEventListener('authChanged', onAuthChanged);
  return () => {
    observer.disconnect();
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('authChanged', onAuthChanged);
  };
};
