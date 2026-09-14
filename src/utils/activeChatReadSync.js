import api from '../services/api';

const EVENT_NAME = 'laora:realtime';
let installed = false;
let inFlightMatchId = null;

export function installActiveChatReadSync() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(EVENT_NAME, async (event) => {
    const payload = event.detail;
    const matchId = payload?.payload?.match_id;

    if (
      payload?.type !== 'message.created'
      || !matchId
      || document.visibilityState !== 'visible'
      || !document.querySelector('.p-chat')
      || inFlightMatchId === matchId
    ) return;

    inFlightMatchId = matchId;
    try {
      // Reading the active conversation is the API's idempotent read acknowledgement.
      // Keep this silent: realtime already inserted the message in React state.
      await api.get(`/laora/matches/${matchId}/messages?limit=1`);
      window.dispatchEvent(new CustomEvent('laora:active-chat-read', { detail: { matchId } }));
    } catch {
      // The existing visibility/30s refresh remains the fallback for transient failures.
    } finally {
      if (inFlightMatchId === matchId) inFlightMatchId = null;
    }
  });
}
