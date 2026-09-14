const CHAT_SELECTOR = '.p-chat main';
const MESSAGE_SELECTOR = '.p-message';
const BOTTOM_THRESHOLD_PX = 96;

const isNearBottom = (element) => (
  element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX
);

const scrollToBottom = (element, behavior = 'auto') => {
  element.scrollTo({ top: element.scrollHeight, behavior });
};

const enhanceChat = (chatMain) => {
  if (!chatMain || chatMain.dataset.laoraAutoScroll === '1') return;
  chatMain.dataset.laoraAutoScroll = '1';

  let followLatest = true;
  const updateFollowState = () => { followLatest = isNearBottom(chatMain); };
  chatMain.addEventListener('scroll', updateFollowState, { passive: true });

  requestAnimationFrame(() => scrollToBottom(chatMain));

  const observer = new MutationObserver((mutations) => {
    const addedMessages = mutations.flatMap((mutation) => [...mutation.addedNodes])
      .filter((node) => node instanceof Element)
      .flatMap((node) => [
        ...(node.matches?.(MESSAGE_SELECTOR) ? [node] : []),
        ...node.querySelectorAll?.(MESSAGE_SELECTOR) || [],
      ]);

    if (!addedMessages.length) return;
    const ownMessageAdded = addedMessages.some((message) => message.classList.contains('mine'));
    if (followLatest || ownMessageAdded) requestAnimationFrame(() => scrollToBottom(chatMain, 'smooth'));
  });

  observer.observe(chatMain, { childList: true, subtree: true });
};

export const installChatAutoScroll = () => {
  const scan = (root = document) => {
    if (root instanceof Element && root.matches(CHAT_SELECTOR)) enhanceChat(root);
    root.querySelectorAll?.(CHAT_SELECTOR).forEach(enhanceChat);
  };

  scan();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node instanceof Element) scan(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
