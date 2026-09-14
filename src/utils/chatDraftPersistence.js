const STORAGE_PREFIX = 'laora:chat-draft:';

const setReactInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const draftKeyFor = (chat) => {
  const participant = chat.querySelector('header b')?.textContent?.trim();
  if (!participant) return null;
  return `${STORAGE_PREFIX}${encodeURIComponent(participant.toLocaleLowerCase('pt-BR'))}`;
};

const enhanceChat = (chat) => {
  if (!chat || chat.dataset.draftPersistence === '1') return;
  const form = chat.querySelector('form');
  const input = form?.querySelector('input');
  const key = draftKeyFor(chat);
  if (!form || !input || !key) return;

  chat.dataset.draftPersistence = '1';

  try {
    const draft = sessionStorage.getItem(key);
    if (draft && !input.value) setReactInputValue(input, draft);
  } catch { /* session storage may be unavailable */ }

  const persist = () => {
    try {
      const value = input.value;
      if (value.trim()) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch { /* keep the React in-memory value */ }
  };

  input.addEventListener('input', persist);
  form.addEventListener('submit', () => {
    const submittedValue = input.value;
    let checks = 0;
    const watchSend = window.setInterval(() => {
      checks += 1;
      if (!input.isConnected || !input.value) {
        window.clearInterval(watchSend);
        persist();
        return;
      }
      if (input.value !== submittedValue || checks >= 80) window.clearInterval(watchSend);
    }, 250);
  });
};

export const installChatDraftPersistence = () => {
  if (typeof document === 'undefined') return () => {};

  const scan = () => document.querySelectorAll('.p-chat').forEach(enhanceChat);
  scan();

  const observer = new MutationObserver((mutations) => {
    const hasChat = mutations.some((mutation) => [...mutation.addedNodes].some((node) => (
      node.nodeType === 1 && (node.matches?.('.p-chat') || node.querySelector?.('.p-chat'))
    )));
    if (hasChat) scan();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
