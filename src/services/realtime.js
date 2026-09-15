import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './api';

window.Pusher = Pusher;

let echo = null;
const realtimeMessages = new Map();

const messageKey = (matchId, messageId) => `${String(matchId)}:${String(messageId)}`;

const rememberRealtimeMessage = (event) => {
  if (event?.type !== 'message.created' || !event?.payload?.match_id || !event?.payload?.message?.id) return;
  realtimeMessages.set(messageKey(event.payload.match_id, event.payload.message.id), {
    matchId: String(event.payload.match_id),
    message: event.payload.message,
    receivedAt: Date.now(),
  });
  const cutoff = Date.now() - 5 * 60 * 1000;
  realtimeMessages.forEach((entry, key) => { if (entry.receivedAt < cutoff) realtimeMessages.delete(key); });
};

const mergeRealtimeMessages = (response) => {
  const url = String(response?.config?.url || '').split('?')[0];
  const match = url.match(/\/connections\/matches\/([^/]+)\/messages$/);
  if (!match || !Array.isArray(response?.data?.data)) return response;
  const matchId = String(match[1]);
  const merged = new Map(response.data.data.map((message) => [String(message.id), message]));
  realtimeMessages.forEach((entry) => { if (entry.matchId === matchId) merged.set(String(entry.message.id), entry.message); });
  response.data.data = [...merged.values()].sort((a, b) => {
    const aId = Number(a.id); const bId = Number(b.id);
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
  return response;
};

api.interceptors.response.use(mergeRealtimeMessages);

export function createLaoraRealtime(userId, onEvent) {
  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key || !userId) return () => {};

  const token = localStorage.getItem('token');
  const appSlug = import.meta.env.VITE_APP_SLUG || 'laora';
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
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-Peter-App': appSlug,
        },
      },
    });

    const channel = echo.private(`laora.user.${userId}`);
    channel.listen('.laora.event', (event) => {
      rememberRealtimeMessage(event);
      onEvent(event);
      window.dispatchEvent(new CustomEvent('laora:realtime', { detail: event }));
    });

    return () => {
      try { echo.leave(`laora.user.${userId}`); } catch { /* noop */ }
      try { echo.disconnect(); } catch { /* noop */ }
      echo = null;
    };
  } catch {
    return () => {};
  }
}
