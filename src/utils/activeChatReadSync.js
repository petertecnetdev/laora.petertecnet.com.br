import api from '../services/api';

const EVENT_NAME = 'laora:realtime';
let installed = false;
let inFlightMatchId = null;

const visibleMessageCount = () => document.querySelectorAll('.p-chat main .p-message').length;

export function installActiveChatReadSync() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(EVENT_NAME, (event) => {
    const payload = event.detail;
    const matchId = payload?.payload?.match_id;

    if (
      payload?.type !== 'message.created'
      || !matchId
      || document.visibilityState !== 'visible'
      || !document.querySelector('.p-chat')
      || inFlightMatchId === matchId
    ) return;

    const beforeCount = visibleMessageCount();
    window.requestAnimationFrame(async () => {
      // ProductionApp only appends a realtime message when its match is the chat
      // currently open. The DOM count therefore prevents acknowledging messages
      // from a different match merely because some chat is visible.
      if (visibleMessageCount() <= beforeCount || document.visibilityState !== 'visible') return;

      inFlightMatchId = matchId;
      try {
        // Reading the active conversation is the API's idempotent read acknowledgement.
        await api.get(`/laora/matches/${matchId}/messages?limit=1`);
      } catch {
        // Visibility/periodic refresh remains the fallback for transient failures.
      } finally {
        if (inFlightMatchId === matchId) inFlightMatchId = null;
      }
    });
  });
}
