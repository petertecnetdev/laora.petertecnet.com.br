const OFFLINE_CLASS = 'p-chat-offline';
const NOTICE_CLASS = 'p-chat-connectivity-notice';

const syncChatConnectivity = () => {
  const chat = document.querySelector('.p-chat');
  if (!chat) return;

  const form = chat.querySelector('form');
  const input = form?.querySelector('input');
  const button = form?.querySelector('button');
  if (!form || !input || !button) return;

  let notice = chat.querySelector(`.${NOTICE_CLASS}`);
  if (!notice) {
    notice = document.createElement('div');
    notice.className = NOTICE_CLASS;
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    form.before(notice);
  }

  const offline = !navigator.onLine;
  chat.classList.toggle(OFFLINE_CLASS, offline);
  notice.hidden = !offline;
  notice.textContent = offline
    ? 'Você está sem internet. Sua mensagem foi preservada e poderá ser enviada quando a conexão voltar.'
    : '';

  if (offline) {
    input.dataset.connectivityDisabled = input.disabled ? 'existing' : 'managed';
    button.dataset.connectivityDisabled = button.disabled ? 'existing' : 'managed';
    input.disabled = true;
    button.disabled = true;
    input.setAttribute('aria-describedby', '');
  } else {
    if (input.dataset.connectivityDisabled === 'managed') input.disabled = false;
    if (button.dataset.connectivityDisabled === 'managed') button.disabled = false;
    delete input.dataset.connectivityDisabled;
    delete button.dataset.connectivityDisabled;
  }
};

export const installChatConnectivity = () => {
  if (typeof window === 'undefined' || window.__laoraChatConnectivityInstalled) return;
  window.__laoraChatConnectivityInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      syncChatConnectivity();
    });
  };

  window.addEventListener('online', schedule);
  window.addEventListener('offline', schedule);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
      node.nodeType === Node.ELEMENT_NODE && (node.matches?.('.p-chat') || node.querySelector?.('.p-chat'))))) {
      schedule();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
};
