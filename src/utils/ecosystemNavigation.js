const NAVIGATION_SCRIPT_SELECTOR = 'script[data-peter-navigation]';
const NAVIGATION_SCRIPT_SRC = 'https://petertecnet.com.br/ecosystem/peter-navigation-v1.js?v=1.0.0';

let navigationLoadPromise;

export function installEcosystemNavigation({ windowObject = window, documentObject = document } = {}) {
  if (windowObject.PeterTecnetNavigation) return Promise.resolve(windowObject.PeterTecnetNavigation);
  if (navigationLoadPromise) return navigationLoadPromise;

  const existingScript = documentObject.querySelector(NAVIGATION_SCRIPT_SELECTOR);
  if (existingScript) {
    navigationLoadPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(windowObject.PeterTecnetNavigation || null), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Ecosystem navigation script failed to load')), { once: true });
    });
    return navigationLoadPromise;
  }

  const script = documentObject.createElement('script');
  script.defer = true;
  script.dataset.peterNavigation = 'true';
  script.src = NAVIGATION_SCRIPT_SRC;

  navigationLoadPromise = new Promise((resolve, reject) => {
    script.addEventListener('load', () => resolve(windowObject.PeterTecnetNavigation || null), { once: true });
    script.addEventListener('error', () => {
      script.remove();
      navigationLoadPromise = undefined;
      reject(new Error('Ecosystem navigation script failed to load'));
    }, { once: true });
    documentObject.head.appendChild(script);
  });

  return navigationLoadPromise;
}
