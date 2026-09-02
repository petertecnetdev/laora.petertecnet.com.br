import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echo = null;

export function createLaoraRealtime(userId, onEvent) {
  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key || !userId) return () => {};

  const token = localStorage.getItem('token');
  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname.replace(/^laora\./, 'api.');
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'https';
  const port = Number(import.meta.env.VITE_REVERB_PORT || (scheme === 'https' ? 443 : 80));

  try {
    echo = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${import.meta.env.VITE_API_ORIGIN || 'https://api.petertecnet.com.br'}/broadcasting/auth`,
      auth: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    });

    const channel = echo.private(`laora.user.${userId}`);
    channel.listen('.laora.event', onEvent);

    return () => {
      try { echo.leave(`laora.user.${userId}`); } catch { /* noop */ }
      try { echo.disconnect(); } catch { /* noop */ }
      echo = null;
    };
  } catch {
    return () => {};
  }
}
