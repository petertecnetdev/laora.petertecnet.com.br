import api from '../services/api';

const EVENT_NAME = 'laora:realtime';
let installed = false;
let inFlightMatchId = null;

const visibleMessageCount = () => document.querySelectorAll('.p-chat main .p-message').length;
const latestIncomingBody = () => {
  const nodes = document.querySelectorAll('.p-chat main .p-message:not(.mine) p');
  return nodes.length ? nodes[nodes.length - 1].textContent : null;
};

export function installActiveChatReadSync() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(EVENT_NAME, (event) => {
    const payload = event.detail;
    const matchId = payload?.payload?.match_id;
    const messageBody = payload?.payload?.message?.body;

    if (
      payload?.type !== 'message.created'
      || !matchId
      || typeof messageBody !== 'string'
      || document.visibilityState !== 'visible'
      || !document.querySelector('.p-chat')
      || inFlightMatchId === matchId
    ) return;

    const beforeCount = visibleMessageCount();
    window.requestAnimationFrame(async () => {
      // ProductionApp appends a realtime message only when its match is the chat
      // currently open. Requiring both a new DOM message and the received body
      // prevents acknowledging a message from another match.
      if (
        visibleMessageCount() <= beforeCount
        || latestIncomingBody() !== messageBody
        || document.visibilityState !== 'visible'
      ) return;

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
