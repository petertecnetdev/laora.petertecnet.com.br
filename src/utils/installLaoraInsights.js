const HOST_ID = 'laora-personal-insights';

function toNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildData() {
  const cards = Array.from(document.querySelectorAll('.p-match-grid .p-match'));
  if (!cards.length) return [];

  const unreadMatches = cards.filter((card) => card.querySelector('.p-badge')).length;
  const unreadMessages = cards.reduce((sum, card) => sum + toNumber(card.querySelector('.p-badge')?.textContent), 0);
  const activeConversations = cards.filter((card) => {
    const text = card.querySelector('p')?.textContent?.trim() || '';
    return text && text !== 'Novo match! Diga oi.';
  }).length;

  return [
    { label: 'Matches', value: cards.length },
    { label: 'Conversas iniciadas', value: activeConversations },
    { label: 'Matches com não lidas', value: unreadMatches },
    { label: 'Mensagens não lidas', value: unreadMessages },
  ];
}

function render() {
  const page = Array.from(document.querySelectorAll('.p-page')).find((node) => node.querySelector('.p-heading h1')?.textContent?.trim() === 'Seus matches');
  const grid = page?.querySelector('.p-match-grid');
  if (!page || !grid || !customElements.get('peter-insight-chart')) {
    document.getElementById(HOST_ID)?.remove();
    return;
  }

  const data = buildData();
  if (!data.length) {
    document.getElementById(HOST_ID)?.remove();
    return;
  }

  const signature = JSON.stringify(data);
  let host = document.getElementById(HOST_ID);
  if (host?.dataset.insightSignature === signature) return;

  if (!host) {
    host = document.createElement('section');
    host.id = HOST_ID;
    host.setAttribute('aria-label', 'Resumo visual das suas conexões');
    host.style.marginBottom = '20px';
    grid.insertAdjacentElement('beforebegin', host);
  }

  host.dataset.insightSignature = signature;
  host.replaceChildren();
  const chart = document.createElement('peter-insight-chart');
  chart.setAttribute('type', 'bar');
  chart.setAttribute('title', 'Resumo das suas conexões');
  chart.setAttribute('subtitle', 'Uma leitura privada dos matches e conversas já carregados nesta tela. Nenhum dado adicional é enviado ou solicitado.');
  chart.setAttribute('data', JSON.stringify(data));
  chart.setAttribute('primary-label', 'Quantidade');
  host.appendChild(chart);
}

export function installLaoraInsights() {
  let timer = null;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 80);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('popstate', schedule);
  schedule();

  return () => {
    observer.disconnect();
    window.removeEventListener('popstate', schedule);
    window.clearTimeout(timer);
    document.getElementById(HOST_ID)?.remove();
  };
}