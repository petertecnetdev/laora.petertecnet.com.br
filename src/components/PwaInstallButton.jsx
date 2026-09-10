import { useEffect, useState } from 'react';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isMobile = () => window.matchMedia?.('(max-width: 767px)').matches;

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const refreshVisibility = () => setVisible(Boolean(installPrompt) && isMobile() && !isStandalone());
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setVisible(isMobile() && !isStandalone());
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('resize', refreshVisibility);
    refreshVisibility();

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('resize', refreshVisibility);
    };
  }, [installPrompt]);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      setInstallPrompt(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return <button type="button" className="laora-pwa-install" onClick={install}>Instalar aplicativo</button>;
}
