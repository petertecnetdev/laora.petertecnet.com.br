import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle, FiArrowDown, FiArrowUp, FiCamera, FiCheck, FiDownload, FiFlag,
  FiHeart, FiLock, FiLogOut, FiMapPin, FiMessageCircle, FiRefreshCw, FiSend,
  FiSettings, FiShield, FiTrash2, FiUser, FiX,
} from 'react-icons/fi';
import api from './services/api';
import { createLaoraRealtime } from './services/realtime';
import './production.css';

const INITIAL_PROFILE = {
  display_name: '', birthdate: '', gender: '', orientation: '', bio: '', interests: [], city: '', uf: '',
  age_min: 18, age_max: 55, max_distance_km: 80, preferred_genders: [], discovery_enabled: true,
};

const reasonOptions = [
  ['fake_profile', 'Perfil falso'], ['harassment', 'Assédio'], ['spam', 'Spam'], ['sexual_content', 'Conteúdo sexual inadequado'],
  ['underage', 'Possível menor de idade'], ['violence', 'Violência ou ameaça'], ['scam', 'Golpe ou fraude'], ['other', 'Outro'],
];

const errorMessage = (error, fallback = 'Não foi possível concluir esta ação.') => {
  const data = error?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || data?.error || error?.message || fallback;
};

const storeSession = (response) => {
  const token = response?.data?.token?.access_token || response?.data?.access_token;
  if (!token) throw new Error('A API não retornou uma sessão válida.');
  localStorage.setItem('token', token);
  const user = response?.data?.token?.user;
  if (user) localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('authChanged'));
  return token;
};

function Brand() {
  return <span className="p-brand"><span className="p-mark"><i /></span><strong>Laora</strong></span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`p-toast ${toast.type || ''}`}>{toast.message}</div>;
}

function Busy({ label = 'Carregando…' }) {
  return <div className="p-busy"><span /><b>{label}</b></div>;
}

function GoogleLogin({ onSuccess, disabled, notify }) {
  const ref = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ref.current) return undefined;
    const render = () => {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const response = await api.post('/auth/google', { token_id: credential });
            storeSession(response);
            onSuccess();
          } catch (error) { notify(errorMessage(error), 'error'); }
        },
      });
      ref.current.innerHTML = '';
      window.google.accounts.id.renderButton(ref.current, { theme: 'filled_black', size: 'large', width: 320, text: 'continue_with' });
    };
    if (window.google?.accounts?.id) { render(); return undefined; }
    const existing = document.querySelector('script[data-laora-google]');
    if (existing) { existing.addEventListener('load', render); return () => existing.removeEventListener('load', render); }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true; script.dataset.laoraGoogle = '1'; script.onload = render;
    document.head.appendChild(script);
    return undefined;
  }, [clientId, notify, onSuccess]);

  if (!clientId) return null;
  return <div className={disabled ? 'google-wrap disabled' : 'google-wrap'} ref={ref} />;
}

function Auth({ onAuthenticated, notify }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ first_name: '', email: '', username: '', password: '', code: '', new_password: '' });
  const [info, setInfo] = useState('');

  const login = async (username = form.username, password = form.password) => {
    const response = await api.post('/auth/login', { username: username.trim(), password });
    storeSession(response);
    return response;
  };

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setInfo('');
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { first_name: form.first_name.trim(), email: form.email.trim(), password: form.password });
        await login(form.email, form.password);
        setMode('verify'); setInfo('Conta criada. Digite o código que enviamos ao seu e-mail.');
      } else if (mode === 'verify') {
        await api.post('/auth/email-verify', { verification_code: form.code.trim() });
        notify('E-mail verificado com sucesso.'); onAuthenticated();
      } else if (mode === 'forgot') {
        await api.post('/auth/password-email', { email: form.email.trim() });
        setMode('reset'); setInfo('Se o e-mail estiver cadastrado, o código foi enviado.');
      } else if (mode === 'reset') {
        await api.post('/auth/password-reset', { email: form.email.trim(), reset_password_code: form.code.trim(), password: form.new_password });
        setMode('login'); setForm((v) => ({ ...v, username: v.email, password: '' })); setInfo('Senha redefinida. Entre novamente.');
      } else {
        await login(); onAuthenticated();
      }
    } catch (error) { setInfo(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true);
    try { await api.post('/auth/resend-code-email-verification'); setInfo('Novo código enviado.'); }
    catch (error) { setInfo(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const titles = { login: 'Entrar no Laora', register: 'Criar conta', verify: 'Verificar e-mail', forgot: 'Recuperar senha', reset: 'Criar nova senha' };
  return <main className="p-auth">
    <section className="p-auth-hero"><Brand /><div><span className="p-eyebrow"><FiShield /> relacionamento com transparência</span><h1>Conexões reais.<br /><em>Matches sem esconderijo.</em></h1><p>O match recíproco aparece para os dois. Chat somente depois do match, controles de privacidade, denúncia e bloqueio.</p></div><small>Laora é exclusivo para maiores de 18 anos.</small></section>
    <section className="p-auth-panel"><form className="p-card p-auth-card" onSubmit={submit}><h2>{titles[mode]}</h2>
      {mode === 'register' && <label>Primeiro nome<input required minLength={2} maxLength={100} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>}
      {['register', 'forgot', 'reset'].includes(mode) && <label>E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>}
      {mode === 'login' && <label>E-mail, usuário, CPF ou telefone<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" /></label>}
      {['login', 'register'].includes(mode) && <label>Senha<input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
      {['verify', 'reset'].includes(mode) && <label>Código<input required inputMode="numeric" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>}
      {mode === 'reset' && <label>Nova senha<input required type="password" minLength={8} value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></label>}
      {info && <div className="p-info">{info}</div>}
      <button className="p-primary" disabled={busy}>{busy ? 'Aguarde…' : titles[mode]}</button>
      {mode === 'verify' && <button type="button" className="p-link" onClick={resend} disabled={busy}>Reenviar código</button>}
      {mode === 'login' && <><GoogleLogin onSuccess={onAuthenticated} disabled={busy} notify={notify} /><button type="button" className="p-link" onClick={() => setMode('forgot')}>Esqueci minha senha</button><button type="button" className="p-link" onClick={() => setMode('register')}>Criar uma conta</button></>}
      {mode !== 'login' && mode !== 'verify' && <button type="button" className="p-link" onClick={() => setMode('login')}>Voltar para o login</button>}
      <p className="p-legal-mini">Ao continuar, você confirma ter 18 anos ou mais e concorda com os Termos, Política de Privacidade e Diretrizes da Comunidade.</p>
    </form></section>
  </main>;
}

function VerifyBanner({ onVerified, notify }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const verify = async () => { setBusy(true); try { await api.post('/auth/email-verify', { verification_code: code.trim() }); notify('E-mail verificado.'); onVerified(); } catch (e) { notify(errorMessage(e), 'error'); } finally { setBusy(false); } };
  const resend = async () => { try { await api.post('/auth/resend-code-email-verification'); notify('Novo código enviado.'); } catch (e) { notify(errorMessage(e), 'error'); } };
  return <div className="p-verify"><FiAlertTriangle /><div><b>Verifique seu e-mail para liberar descoberta, matches e chat.</b><div className="p-inline"><input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} /><button onClick={verify} disabled={busy}>Verificar</button><button onClick={resend}>Reenviar</button></div></div></div>;
}

function Profile({ profile, reload, notify }) {
  const [form, setForm] = useState({ ...INITIAL_PROFILE, ...(profile || {}) });
  const [interest, setInterest] = useState(''); const [busy, setBusy] = useState(false); const [location, setLocation] = useState(null);
  useEffect(() => setForm({ ...INITIAL_PROFILE, ...(profile || {}) }), [profile]);

  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, interests: (form.interests || []).filter(Boolean).slice(0, 12), preferred_genders: form.preferred_genders || [] };
      delete payload.photos; delete payload.has_location; delete payload.is_complete; delete payload.age; delete payload.id; delete payload.user_id; delete payload.last_active_at;
      if (location) Object.assign(payload, location);
      await api.put('/laora/profile', payload); notify('Perfil salvo.'); setLocation(null); await reload();
    } catch (e) { notify(errorMessage(e), 'error'); } finally { setBusy(false); }
  };

  const geolocate = () => {
    if (!navigator.geolocation) { notify('Seu navegador não oferece geolocalização.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ latitude: Number(coords.latitude.toFixed(7)), longitude: Number(coords.longitude.toFixed(7)) }); notify('Localização capturada. Salve o perfil para atualizar o raio.'); },
      () => notify('Não foi possível obter sua localização. Autorize o acesso no navegador.', 'error'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const body = new FormData(); body.append('photo', file);
    try { const { data } = await api.post('/laora/profile/photos', body, { headers: { 'Content-Type': 'multipart/form-data' } }); notify(data.message || 'Foto enviada.'); await reload(); }
    catch (e) { notify(errorMessage(e), 'error'); } finally { event.target.value = ''; }
  };

  const remove = async (id) => { if (!window.confirm('Remover esta foto?')) return; try { await api.delete(`/laora/profile/photos/${id}`); await reload(); } catch (e) { notify(errorMessage(e), 'error'); } };
  const move = async (id, delta) => {
    const photos = [...(profile?.photos || [])]; const from = photos.findIndex((p) => p.id === id); const to = from + delta; if (from < 0 || to < 0 || to >= photos.length) return;
    [photos[from], photos[to]] = [photos[to], photos[from]];
    try { await api.patch('/laora/profile/photos/reorder', { photo_ids: photos.map((p) => p.id) }); await reload(); } catch (e) { notify(errorMessage(e), 'error'); }
  };
  const togglePref = (value) => setForm((v) => ({ ...v, preferred_genders: v.preferred_genders?.includes(value) ? v.preferred_genders.filter((x) => x !== value) : [...(v.preferred_genders || []), value] }));
  const addInterest = () => { const value = interest.trim(); if (!value || form.interests?.includes(value) || (form.interests?.length || 0) >= 12) return; setForm((v) => ({ ...v, interests: [...(v.interests || []), value] })); setInterest(''); };

  return <div className="p-page"><header className="p-heading"><span className="p-eyebrow"><FiUser /> seu perfil</span><h1>Mostre quem você é</h1><p>Localização exata nunca é exibida publicamente; ela serve apenas para calcular distância.</p></header>
    <div className="p-two"><section className="p-card"><div className="p-card-head"><div><h2>Fotos</h2><p>Até 6 fotos. Novos uploads entram em moderação antes de aparecer publicamente.</p></div><label className="p-button"><FiCamera /> Adicionar<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label></div><div className="p-photo-grid">{(profile?.photos || []).map((photo, index) => <article className="p-photo" key={photo.id}><img src={photo.url} alt="Foto do perfil" /><span className={`p-status ${photo.moderation_status}`}>{photo.moderation_status === 'approved' ? 'Aprovada' : photo.moderation_status === 'rejected' ? 'Rejeitada' : 'Em análise'}</span>{photo.is_primary && <b>Principal</b>}<div><button onClick={() => move(photo.id, -1)} disabled={index === 0}><FiArrowUp /></button><button onClick={() => move(photo.id, 1)} disabled={index === profile.photos.length - 1}><FiArrowDown /></button><button onClick={() => remove(photo.id)}><FiTrash2 /></button></div></article>)}</div></section>
    <form className="p-card p-form" onSubmit={save}><div className="p-fields two"><label>Nome exibido<input required minLength={2} maxLength={80} value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label><label>Nascimento<input required type="date" value={form.birthdate || ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></label></div>
      <div className="p-fields two"><label>Gênero<select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Não informar</option><option value="woman">Mulher</option><option value="man">Homem</option><option value="non_binary">Não binário</option><option value="other">Outro</option></select></label><label>Orientação<select value={form.orientation || ''} onChange={(e) => setForm({ ...form, orientation: e.target.value })}><option value="">Não informar</option><option value="straight">Heterossexual</option><option value="gay">Homossexual</option><option value="bisexual">Bissexual</option><option value="pansexual">Pansexual</option><option value="other">Outra</option></select></label></div>
      <label>Sobre você<textarea rows={5} maxLength={800} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
      <div className="p-fields two"><label>Cidade<input maxLength={120} value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label><label>UF<input maxLength={2} value={form.uf || ''} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></label></div>
      <div className="p-location"><FiMapPin /><span>{location ? 'Nova localização capturada e pronta para salvar.' : profile?.has_location ? 'Localização protegida configurada.' : 'Localização ainda não configurada.'}</span><button type="button" onClick={geolocate}>Usar minha localização</button></div>
      <div><span className="p-label">Interesses</span><div className="p-inline"><input value={interest} onChange={(e) => setInterest(e.target.value)} maxLength={40} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} /><button type="button" onClick={addInterest}>Adicionar</button></div><div className="p-chips">{(form.interests || []).map((x) => <button type="button" key={x} onClick={() => setForm({ ...form, interests: form.interests.filter((i) => i !== x) })}>{x} <FiX /></button>)}</div></div>
      <div><span className="p-label">Quero conhecer</span><div className="p-chips">{[['woman','Mulheres'],['man','Homens'],['non_binary','Não binários'],['other','Outros']].map(([v,l]) => <button type="button" key={v} className={form.preferred_genders?.includes(v) ? 'active' : ''} onClick={() => togglePref(v)}>{form.preferred_genders?.includes(v) && <FiCheck />} {l}</button>)}</div></div>
      <div className="p-fields three"><label>Idade mínima<input type="number" min="18" max="99" value={form.age_min} onChange={(e) => setForm({ ...form, age_min: Number(e.target.value) })} /></label><label>Idade máxima<input type="number" min="18" max="99" value={form.age_max} onChange={(e) => setForm({ ...form, age_max: Number(e.target.value) })} /></label><label>Distância (km)<input type="number" min="1" max="500" value={form.max_distance_km} onChange={(e) => setForm({ ...form, max_distance_km: Number(e.target.value) })} /></label></div>
      <label className="p-toggle"><input type="checkbox" checked={Boolean(form.discovery_enabled)} onChange={(e) => setForm({ ...form, discovery_enabled: e.target.checked })} /><span><b>Mostrar meu perfil na descoberta</b><small>Pause sua visibilidade quando quiser.</small></span></label><button className="p-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button>
    </form></div></div>;
}

function Discover({ profiles, loading, reload, swipe, report }) {
  if (loading) return <Busy label="Buscando pessoas compatíveis…" />;
  const current = profiles[0];
  if (!current) return <div className="p-empty"><FiHeart /><h2>Ninguém novo por enquanto</h2><p>Seus filtros, preferências bilaterais, localização e segurança são respeitados.</p><button onClick={reload}><FiRefreshCw /> Atualizar</button></div>;
  const photo = current.photos?.[0]?.url;
  return <div className="p-discover"><header className="p-heading"><span className="p-eyebrow">descobrir</span><h1>Uma pessoa de cada vez.</h1></header><article className="p-dating-card"><div className="p-dating-photo">{photo ? <img src={photo} alt={current.display_name} /> : <div className="p-avatar">{current.display_name?.[0]}</div>}<div><h2>{current.display_name}, {current.age}</h2><p><FiMapPin /> {[current.city,current.uf].filter(Boolean).join(' • ') || 'Localização protegida'}{current.distance_km != null ? ` • ${current.distance_km} km` : ''}</p></div></div><div className="p-dating-body"><p>{current.bio || 'Ainda sem descrição.'}</p><div className="p-chips">{current.interests?.map((x) => <span key={x}>{x}</span>)}</div><button className="p-danger-link" onClick={() => report(current)}><FiFlag /> Denunciar ou bloquear</button></div><footer><button className="p-pass" onClick={() => swipe(current.user_id, 'pass')}><FiX /></button><button className="p-like" onClick={() => swipe(current.user_id, 'like')}><FiHeart /></button></footer></article></div>;
}

function Matches({ matches, openChat, unmatch, report }) {
  return <div className="p-page"><header className="p-heading"><span className="p-eyebrow"><FiHeart /> conexões</span><h1>Seus matches</h1><p>Todo match recíproco fica visível para os dois.</p></header>{!matches.length ? <div className="p-empty"><FiHeart /><h2>Seus próximos matches vão aparecer aqui.</h2></div> : <div className="p-match-grid">{matches.map((match) => <article className="p-card p-match" key={match.id}>{match.profile?.photos?.[0]?.url ? <img src={match.profile.photos[0].url} alt="" /> : <div className="p-avatar">{match.profile?.display_name?.[0]}</div>}<div><h3>{match.profile?.display_name}</h3><p>{match.last_message?.body || 'Novo match! Diga oi.'}</p>{match.unread_count > 0 && <b className="p-badge">{match.unread_count}</b>}</div><div className="p-actions"><button onClick={() => openChat(match)}><FiMessageCircle /> Conversar</button><button onClick={() => report(match.profile, match.id)}><FiFlag /></button><button onClick={() => unmatch(match)}><FiX /></button></div></article>)}</div>}</div>;
}

function Chat({ match, messages, loading, hasMore, loadOlder, send, close, report }) {
  const [body, setBody] = useState('');
  const submit = (e) => { e.preventDefault(); const text = body.trim(); if (!text) return; send(text); setBody(''); };
  return <div className="p-chat"><header><button onClick={close}>←</button><div><b>{match.profile?.display_name}</b><small>Match seguro · chat após reciprocidade</small></div><button onClick={() => report(match.profile, match.id)}><FiShield /></button></header><main>{hasMore && <button className="p-older" onClick={loadOlder}>Carregar mensagens anteriores</button>}{loading ? <Busy /> : messages.map((m) => <div className={`p-message ${m.sender_user_id === Number(JSON.parse(localStorage.getItem('user') || '{}').id) ? 'mine' : ''}`} key={m.id}><p>{m.body}</p><small>{m.read_at ? 'Lida' : 'Enviada'} · {new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>)}</main><form onSubmit={submit}><input maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva uma mensagem…" /><button><FiSend /></button></form></div>;
}

function SafetyModal({ target, onClose, notify, afterAction }) {
  const [reason, setReason] = useState('other'); const [details, setDetails] = useState(''); const [busy, setBusy] = useState(false);
  const block = async () => { setBusy(true); try { await api.post(`/laora/users/${target.user_id}/block`, { reason: 'user_request' }); notify('Usuário bloqueado.'); afterAction(); onClose(); } catch (e) { notify(errorMessage(e), 'error'); } finally { setBusy(false); } };
  const report = async () => { setBusy(true); try { await api.post('/laora/reports', { reported_user_id: target.user_id, match_id: target.match_id || null, reason, details, block_user: true }); notify('Denúncia enviada e usuário bloqueado.'); afterAction(); onClose(); } catch (e) { notify(errorMessage(e), 'error'); } finally { setBusy(false); } };
  return <div className="p-modal"><section className="p-card"><button className="p-close" onClick={onClose}><FiX /></button><FiShield className="p-modal-icon" /><h2>Segurança</h2><p>Bloqueios são imediatos. Denúncias entram na fila de moderação.</p><label>Motivo<select value={reason} onChange={(e) => setReason(e.target.value)}>{reasonOptions.map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label><label>Detalhes<textarea rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></label><div className="p-actions"><button disabled={busy} onClick={block}>Somente bloquear</button><button className="p-danger" disabled={busy} onClick={report}><FiFlag /> Denunciar e bloquear</button></div></section></div>;
}

function Settings({ notify, onDeleted }) {
  const [legal, setLegal] = useState('privacy');
  const exportData = async () => { try { const { data } = await api.get('/laora/privacy/export'); const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `laora-meus-dados-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); } catch (e) { notify(errorMessage(e), 'error'); } };
  const remove = async () => { if (!window.confirm('Isso removerá seu perfil, fotos e dados de relacionamento do Laora. Continuar?')) return; const confirmation = window.prompt('Digite EXCLUIR para confirmar:'); if (confirmation !== 'EXCLUIR') return; try { await api.delete('/laora/privacy/profile', { data: { confirmation } }); notify('Perfil do Laora removido.'); onDeleted(); } catch (e) { notify(errorMessage(e), 'error'); } };
  const texts = {
    privacy: ['Privacidade e LGPD', 'Usamos dados de perfil para operar descoberta, matches, segurança e chat. Coordenadas exatas servem apenas para cálculo de distância e não são exibidas publicamente. Você pode exportar ou excluir seu perfil a qualquer momento. Registros mínimos de segurança/moderação podem ser preservados quando houver base legal aplicável.'],
    terms: ['Termos de uso', 'O Laora é destinado somente a maiores de 18 anos. É proibido assédio, fraude, exploração, ameaça, discurso de ódio, conteúdo ilegal, tentativa de contornar bloqueios e uso automatizado abusivo. Matches não garantem identidade ou segurança; encontros presenciais devem ocorrer com cautela.'],
    community: ['Diretrizes da comunidade', 'Respeite consentimento e limites. Não pressione por contato, sexo, dinheiro ou dados pessoais. Não publique fotos de terceiros sem autorização. Denuncie perfis suspeitos. Bloqueios são privados e imediatos. Violações podem gerar advertência, suspensão ou banimento.'],
  };
  return <div className="p-page"><header className="p-heading"><span className="p-eyebrow"><FiSettings /> configurações</span><h1>Privacidade e segurança</h1></header><div className="p-two"><section className="p-card"><h2>Seus dados</h2><p>Exporte uma cópia dos dados do seu perfil e relacionamentos.</p><button className="p-button" onClick={exportData}><FiDownload /> Baixar meus dados</button><hr /><h3>Excluir perfil do Laora</h3><p>Sua conta Peter Tecnet permanece, mas o perfil de relacionamento é removido.</p><button className="p-danger" onClick={remove}><FiTrash2 /> Excluir meu perfil</button></section><section className="p-card"><div className="p-legal-tabs">{Object.keys(texts).map((key) => <button className={legal === key ? 'active' : ''} key={key} onClick={() => setLegal(key)}>{texts[key][0]}</button>)}</div><h2>{texts[legal][0]}</h2><p className="p-legal-text">{texts[legal][1]}</p><p><small>Versão 1.0 · 02/09/2026. A revisão jurídica formal deve acompanhar a operação comercial e mudanças regulatórias.</small></p></section></div></div>;
}

export default function ProductionApp() {
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('token')));
  const [me, setMe] = useState(null); const [profile, setProfile] = useState(null); const [verified, setVerified] = useState(false);
  const [tab, setTab] = useState('discover'); const [profiles, setProfiles] = useState([]); const [matches, setMatches] = useState([]); const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null); const [messages, setMessages] = useState([]); const [messagesMeta, setMessagesMeta] = useState({}); const [messageLoading, setMessageLoading] = useState(false);
  const [safety, setSafety] = useState(null); const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 4200); }, []);
  const loadProfile = useCallback(async () => { const [p, u] = await Promise.all([api.get('/laora/profile'), api.get('/auth/me')]); setProfile(p.data.data); setVerified(Boolean(p.data.meta?.email_verified || u.data.user?.email_verified_at)); setMe(u.data.user); if (u.data.user) localStorage.setItem('user', JSON.stringify(u.data.user)); return p.data.data; }, []);
  const loadDiscover = useCallback(async () => { try { const { data } = await api.get('/laora/discover'); setProfiles(data.data || []); } catch (e) { if (e.response?.status !== 403) notify(errorMessage(e), 'error'); } }, [notify]);
  const loadMatches = useCallback(async () => { try { const { data } = await api.get('/laora/matches?limit=100'); setMatches(data.data || []); } catch (e) { if (e.response?.status !== 403) notify(errorMessage(e), 'error'); } }, [notify]);

  const bootstrap = useCallback(async () => {
    if (!localStorage.getItem('token')) { setAuthenticated(false); setLoading(false); return; }
    setLoading(true);
    try { const p = await loadProfile(); setAuthenticated(true); if (!p?.is_complete) setTab('profile'); await Promise.allSettled([loadDiscover(), loadMatches()]); }
    catch (e) { if (e.response?.status === 401) { localStorage.removeItem('token'); setAuthenticated(false); } else notify(errorMessage(e), 'error'); }
    finally { setLoading(false); }
  }, [loadDiscover, loadMatches, loadProfile, notify]);

  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => {
    if (!authenticated || !me?.id) return undefined;
    const cleanup = createLaoraRealtime(me.id, (event) => {
      if (['match.created','match.ended','message.created','messages.read','relationship.blocked'].includes(event.type)) loadMatches();
      if (event.type === 'message.created' && chat?.id === event.payload?.match_id) setMessages((v) => v.some((m) => m.id === event.payload.message.id) ? v : [...v, event.payload.message]);
      if (event.type === 'photo.moderated') { loadProfile(); notify(event.payload.status === 'approved' ? 'Sua foto foi aprovada.' : 'Uma foto foi rejeitada pela moderação.', event.payload.status === 'approved' ? 'success' : 'error'); }
      if (event.type === 'moderation.action') notify(`Moderação: ${event.payload.action}. ${event.payload.reason || ''}`, 'error');
    });
    return cleanup;
  }, [authenticated, me?.id, chat?.id, loadMatches, loadProfile, notify]);

  useEffect(() => {
    if (!authenticated || !verified) return undefined;
    const id = window.setInterval(() => { loadMatches(); if (chat?.id) loadMessages(chat.id, false, true); }, 8000);
    return () => window.clearInterval(id);
  }, [authenticated, verified, chat?.id, loadMatches]);

  const swipe = async (target, action) => { try { const { data } = await api.post('/laora/swipes', { target_user_id: target, action }); setProfiles((v) => v.filter((p) => p.user_id !== target)); if (data.data?.matched) { notify('É match! A conexão apareceu para vocês dois.'); await loadMatches(); } } catch (e) { notify(errorMessage(e), 'error'); } };
  const openSafety = (target, matchId = null) => setSafety({ ...target, match_id: matchId });
  const unmatch = async (match) => { if (!window.confirm(`Desfazer o match com ${match.profile?.display_name}?`)) return; try { await api.delete(`/laora/matches/${match.id}`); if (chat?.id === match.id) setChat(null); await loadMatches(); } catch (e) { notify(errorMessage(e), 'error'); } };
  const loadMessages = async (matchId, older = false, silent = false) => { if (!silent) setMessageLoading(true); try { const before = older ? messages[0]?.id : null; const { data } = await api.get(`/laora/matches/${matchId}/messages?limit=50${before ? `&before_id=${before}` : ''}`); setMessages((v) => older ? [...(data.data || []), ...v] : (data.data || [])); setMessagesMeta(data.meta || {}); await loadMatches(); } catch (e) { if (!silent) notify(errorMessage(e), 'error'); } finally { if (!silent) setMessageLoading(false); } };
  const openChat = async (match) => { setChat(match); setMessages([]); await loadMessages(match.id); };
  const send = async (body) => { try { const { data } = await api.post(`/laora/matches/${chat.id}/messages`, { body }); setMessages((v) => [...v, data.data]); await loadMatches(); } catch (e) { notify(errorMessage(e), 'error'); } };
  const logout = async () => { try { await api.post('/auth/logout'); } catch { /* noop */ } localStorage.clear(); setAuthenticated(false); setMe(null); setProfile(null); };

  if (!authenticated) return <><Auth onAuthenticated={bootstrap} notify={notify} /><Toast toast={toast} /></>;
  if (loading) return <Busy label="Preparando seu Laora…" />;
  if (chat) return <><Chat match={chat} messages={messages} loading={messageLoading} hasMore={messagesMeta.has_more} loadOlder={() => loadMessages(chat.id, true)} send={send} close={() => { setChat(null); loadMatches(); }} report={openSafety} />{safety && <SafetyModal target={safety} onClose={() => setSafety(null)} notify={notify} afterAction={() => { loadMatches(); loadDiscover(); }} />}<Toast toast={toast} /></>;

  const unread = matches.reduce((sum, m) => sum + Number(m.unread_count || 0), 0);
  return <div className="p-shell"><header className="p-top"><Brand /><nav><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><FiHeart /> Descobrir</button><button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}><FiMessageCircle /> Matches {unread > 0 && <b>{unread}</b>}</button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><FiUser /> Perfil</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><FiSettings /> Segurança</button></nav><button className="p-logout" onClick={logout}><FiLogOut /></button></header>
    {!verified && <VerifyBanner onVerified={bootstrap} notify={notify} />}
    <main>{tab === 'discover' && <Discover profiles={profiles} loading={loading} reload={loadDiscover} swipe={swipe} report={openSafety} />}{tab === 'matches' && <Matches matches={matches} openChat={openChat} unmatch={unmatch} report={openSafety} />}{tab === 'profile' && <Profile profile={profile} reload={loadProfile} notify={notify} />}{tab === 'settings' && <Settings notify={notify} onDeleted={() => { setProfile(null); setProfiles([]); setMatches([]); setTab('profile'); }} />}</main>
    <footer className="p-footer"><a href="https://petertecnet.com.br" target="_blank" rel="noreferrer">Peter Tecnet</a><span>Laora 1.0.0 · conexões com transparência</span></footer>
    {safety && <SafetyModal target={safety} onClose={() => setSafety(null)} notify={notify} afterAction={() => { loadMatches(); loadDiscover(); }} />}<Toast toast={toast} />
  </div>;
}
