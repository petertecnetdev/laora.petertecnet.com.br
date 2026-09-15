const LEGAL_COPY = 'Ao continuar, você confirma ter 18 anos ou mais e concorda com os Termos, Política de Privacidade e Diretrizes da Comunidade.';

const enhanceLegalCopy = (root = document) => {
  const legal = root.querySelector?.('.p-legal-mini');
  if (!legal || legal.dataset.legalLinks === '1') return;
  if (legal.textContent.trim() !== LEGAL_COPY) return;

  legal.replaceChildren(
    document.createTextNode('Ao continuar, você confirma ter 18 anos ou mais e concorda com os '),
    Object.assign(document.createElement('a'), { href: '/termos.html', textContent: 'Termos de Uso' }),
    document.createTextNode(', '),
    Object.assign(document.createElement('a'), { href: '/privacidade.html', textContent: 'Política de Privacidade' }),
    document.createTextNode(' e Diretrizes da Comunidade.'),
  );
  legal.dataset.legalLinks = '1';
};

export const installLegalLinks = () => {
  enhanceLegalCopy();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.p-auth, .p-legal-mini') || node.querySelector('.p-legal-mini')) {
          enhanceLegalCopy(node.matches('.p-legal-mini') ? node.parentElement : node);
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
