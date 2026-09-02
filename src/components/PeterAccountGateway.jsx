import { useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEYS = ['token', 'access_token', 'auth_token'];
const getToken = () => TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || null;
const messageOf = (payload, fallback) => payload?.message || payload?.error || fallback;
const safePeterUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'petertecnet.com.br' || host.endsWith('.petertecnet.com.br'));
  } catch {
    return false;
  }
};

export default function PeterAccountGateway({ apiBaseUrl, appSlug, children }) {
  const api = String(apiBaseUrl || '').replace(/\/+$/, '');
  const slug = String(appSlug || '').trim().toLowerCase();
  const handoffCode = useMemo(() => new URL(window.location.href).searchParams.get('peter_sso'), []);
  const [exchangeState, setExchangeState] = useState('idle');
  const [exchangeError, setExchangeError] = useState('');
  const [ecosystem, setEcosystem] = useState(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!handoffCode || !api || !slug) return undefined;
    let alive = true;
    setExchangeState('loading');
    fetch(`${api}/account/sso/exchange`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Peter-App': slug },
      body: JSON.stringify({ handoff_code: handoffCode, application: slug }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.data?.access_token) throw new Error(messageOf(payload, 'Não foi possível concluir o acesso.'));
        return payload.data;
      })
      .then((data) => {
        if (!alive) return;
        localStorage.setItem('token', data.access_token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        const clean = new URL(window.location.href);
        clean.searchParams.delete('peter_sso');
        clean.searchParams.delete('peter_from');
        window.history.replaceState({}, document.title, `${clean.pathname}${clean.search}${clean.hash}`);
        window.dispatchEvent(new Event('authChanged'));
        setExchangeState('success');
      })
      .catch((error) => {
        if (!alive) return;
        setExchangeError(error?.message || 'Código de acesso inválido ou expirado.');
        setExchangeState('error');
      });
    return () => { alive = false; };
  }, [api, handoffCode, slug]);

  useEffect(() => {
    if (handoffCode && exchangeState !== 'success') return undefined;
    const token = getToken();
    if (!token || !api) return undefined;
    const controller = new AbortController();
    fetch(`${api}/account/ecosystem`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Peter-App': slug },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(messageOf(payload, 'Falha ao carregar a Conta Peter Tecnet.'));
        return payload?.data || null;
      })
      .then(setEcosystem)
      .catch(() => setEcosystem(null));
    return () => controller.abort();
  }, [api, exchangeState, handoffCode, slug]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.type === 'mousedown' && panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  const openApplication = async (application) => {
    if (!application?.has_access || application.slug === slug || switching) return;
    const token = getToken();
    if (!token) return;
    setSwitching(application.slug);
    try {
      const response = await fetch(`${api}/account/sso/handoff`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Peter-App': slug },
        body: JSON.stringify({ application: application.slug }),
      });
      const payload = await response.json().catch(() => ({}));
      const destination = payload?.data?.application?.url || application.url;
      const code = payload?.data?.handoff_code;
      if (!response.ok || !code) throw new Error(messageOf(payload, 'Não foi possível abrir o aplicativo.'));
      if (!safePeterUrl(destination)) throw new Error('Destino não permitido.');
      const url = new URL(destination);
      url.searchParams.set('peter_sso', code);
      url.searchParams.set('peter_from', slug);
      window.location.assign(url.toString());
    } catch {
      setSwitching('');
    }
  };

  if (handoffCode && exchangeState !== 'success') {
    return <div className="gateway-screen"><div className="gateway-card"><span className="laora-mark"><i /></span><h1>Conta Peter Tecnet</h1><p>{exchangeState === 'error' ? exchangeError : 'Conectando sua conta ao Laora com segurança…'}</p>{exchangeState === 'error' ? <a href="/">Voltar ao Laora</a> : <span className="spinner" />}</div></div>;
  }

  const applications = Array.isArray(ecosystem?.applications) ? ecosystem.applications : [];
  const account = ecosystem?.account;
  const initials = `${account?.first_name?.[0] || ''}${account?.last_name?.[0] || ''}`.toUpperCase() || 'PT';

  return <>
    {children}
    {account && applications.length > 0 && <div className="account-launcher" ref={panelRef}>
      <button type="button" className="launcher-button" aria-label="Abrir aplicativos Peter Tecnet" onClick={() => setOpen((value) => !value)}><span>•••<br />•••<br />•••</span></button>
      {open && <div className="launcher-panel">
        <div className="launcher-account"><div className="launcher-avatar">{account.avatar ? <img src={account.avatar} alt="" /> : initials}</div><div><strong>{[account.first_name, account.last_name].filter(Boolean).join(' ') || account.user_name}</strong><small>{account.email}</small></div></div>
        <div className="launcher-grid">{applications.map((application) => <button key={application.id || application.slug} type="button" disabled={!application.has_access || application.slug === slug || Boolean(switching)} onClick={() => openApplication(application)}><span>{String(application.name || 'P').slice(0, 1)}</span><strong>{application.name}</strong><small>{application.slug === slug ? 'Atual' : switching === application.slug ? 'Abrindo…' : application.has_access ? 'Abrir' : 'Sem acesso'}</small></button>)}</div>
        <a href="https://petertecnet.com.br">Ecossistema Peter Tecnet</a>
      </div>}
    </div>}
  </>;
}
