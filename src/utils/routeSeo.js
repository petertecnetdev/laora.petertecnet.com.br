const SITE_URL = 'https://laora.petertecnet.com.br';

const ROUTE_SEO = {
  '/': {
    title: 'Laora | App de relacionamento grátis e conexões reais',
    description: 'Laora é um app de relacionamento grátis para maiores de 18 anos: conheça pessoas, encontre matches recíprocos e converse depois do match, com privacidade, denúncia e bloqueio.',
  },
  '/register': {
    title: 'Criar conta grátis no Laora | Comece a conhecer pessoas',
    description: 'Crie sua conta grátis no Laora, monte seu perfil e comece a descobrir pessoas e encontrar matches recíprocos. Exclusivo para maiores de 18 anos.',
  },
};

const setMeta = (selector, attribute, value) => {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
};

const applyRouteSeo = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const seo = ROUTE_SEO[path] || ROUTE_SEO['/'];
  const canonicalUrl = path === '/register' ? `${SITE_URL}/register` : `${SITE_URL}/`;

  document.title = seo.title;
  setMeta('meta[name="description"]', 'content', seo.description);
  setMeta('link[rel="canonical"]', 'href', canonicalUrl);
  setMeta('meta[property="og:title"]', 'content', seo.title);
  setMeta('meta[property="og:description"]', 'content', seo.description);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[name="twitter:title"]', 'content', seo.title);
  setMeta('meta[name="twitter:description"]', 'content', seo.description);
};

export const installRouteSeo = () => {
  applyRouteSeo();
  window.addEventListener('popstate', applyRouteSeo);
  window.addEventListener('laora:navigation', applyRouteSeo);
};
