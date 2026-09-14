const STARTERS = [
  'Oi! O que chamou sua atenção no meu perfil?',
  'Que bom que deu match 🙂 Como está seu dia?',
  'Vi que temos um match. Qual assunto você nunca cansa de conversar?',
];

const enhanceChat = (chat) => {
  if (!chat || chat.dataset.firstMessageStarters === '1') return;
  const messageList = chat.querySelector('main');
  const form = chat.querySelector('form');
  const input = form?.querySelector('input');
  if (!messageList || !form || !input || messageList.querySelector('.p-message')) return;

  chat.dataset.firstMessageStarters = '1';
  const container = document.createElement('div');
  container.className = 'p-first-message-starters';
  container.setAttribute('aria-label', 'Sugestões para iniciar a conversa');

  const title = document.createElement('small');
  title.textContent = 'Quebre o gelo';
  container.appendChild(title);

  STARTERS.forEach((starter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = starter;
    button.addEventListener('click', () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, starter);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
    container.appendChild(button);
  });

  form.parentNode?.insertBefore(container, form);
};

export const installFirstMessageStarters = () => {
  if (typeof document === 'undefined') return () => {};
  const scan = () => document.querySelectorAll('.p-chat').forEach(enhanceChat);
  scan();
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node.nodeType === 1 && (node.matches?.('.p-chat') || node.querySelector?.('.p-chat'))))) scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
