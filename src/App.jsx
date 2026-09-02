import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCamera, FiCheck, FiChevronLeft, FiFlag, FiHeart, FiLock, FiLogOut, FiMapPin,
  FiMessageCircle, FiRefreshCw, FiSend, FiSettings, FiShield, FiSlash, FiStar,
  FiTrash2, FiUser, FiX,
} from 'react-icons/fi';
import api from './services/api';
import PeterAccountGateway from './components/PeterAccountGateway';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';
const initialProfile = {
  display_name: '', birthdate: '', gender: '', orientation: '', bio: '', interests: [], city: '', uf: '',
  age_min: 18, age_max: 55, max_distance_km: 80, preferred_genders: [], discovery_enabled: true,
};

const messageOf = (error, fallback = 'Não foi possível concluir esta ação.') => {
  const data = error?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || data?.error || error?.message || fallback;
};

function Brand() {
  return <span className="brand"><span className="laora-mark"><i /></span><strong>Laora</strong></span>;
}

function Loading({ label = 'Carregando…' }) {
  return <div className="loading-state" role="status"><span className="spinner" /><span>{label}</span></div>;
}

function Empty({ icon, title, text, action }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{text}</p>{action}</div>;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ username: '', password: '', first_name: '', email: '' });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { first_name: form.first_name, email: form.email, password: form.password });
        setMode('login');
        setForm((value) => ({ ...value, username: form.email }));
        setMessage('Conta criada. Enviamos um código de verificação para seu e-mail. Agora entre com seus dados.');
      } else {
        const response = await api.post('/auth/login', { username: form.username, password: form.password });
        const token = response.data?.token?.access_token;
        if (!token) throw new Error('A API não retornou uma sessão válida.');
        localStorage.setItem('token', token);
        if (response.data?.token?.user) localStorage.setItem('user', JSON.stringify(response.data.token.user));
        window.dispatchEvent(new Event('authChanged'));
        onAuthenticated?.();
      }
    } catch (error) {
      setMessage(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-shell">
    <div className="auth-visual">
      <Brand />
      <span className="eyebrow"><FiShield /> relacionamento com transparência</span>
      <h1>Conexões reais.<br /><em>Sem esconder seu match.</em></h1>
      <p>Curtiu e foi correspondido? O match aparece para os dois. Segurança, consentimento e clareza desde o primeiro contato.</p>
      <div className="auth-principles"><span><FiHeart /> Match recíproco visível</span><span><FiLock /> Chat somente após match</span><span><FiShield /> Bloqueio e denúncia imediatos</span></div>
    </div>
    <form className="auth-card" onSubmit={submit}>
      <div><small>Conta Peter Tecnet</small><h2>{mode === 'login' ? 'Entrar no Laora' : 'Criar sua conta'}</h2><p>{mode === 'login' ? 'Use a mesma conta do ecossistema Peter Tecnet.' : 'O Laora é exclusivo para maiores de 18 anos.'}</p></div>
      {mode === 'register' && <label>Primeiro nome<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required minLength={2} maxLength={100} autoComplete="given-name" /></label>}
      {mode === 'register' && <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>}
      {mode === 'login' && <label>E-mail, usuário ou CPF<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoComplete="username" /></label>}
      <label>Senha<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {mode === 'register' && <small className="password-hint">Use pelo menos 8 caracteres com maiúscula, minúscula, número e símbolo.</small>}
      {message && <div className="form-message">{message}</div>}
      <button className="primary-button" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      <button type="button" className="text-button" onClick={() => { setMessage(''); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
      <p className="legal-copy">Ao continuar, você confirma ter 18 anos ou mais e concorda em usar o Laora com respeito, consentimento e segurança.</p>
    </form>
  </div>;
}

function ProfileEditor({ profile, onSaved, notify }) {
  const [form, setForm] = useState({ ...initialProfile, ...(profile || {}) });
  const [interest, setInterest] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => setForm({ ...initialProfile, ...(profile || {}) }), [profile]);

  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const payload = {
        ...form,
        interests: (form.interests || []).filter(Boolean).slice(0, 12),
        preferred_genders: (form.preferred_genders || []).filter(Boolean),
        latitude: undefined,
        longitude: undefined,
      };
      const { data } = await api.put('/laora/profile', payload);
      onSaved(data.data); notify('Perfil salvo.');
    } catch (error) { notify(messageOf(error), 'error'); } finally { setBusy(false); }
  };

  const addInterest = () => {
    const value = interest.trim();
    if (!value || form.interests?.includes(value) || (form.interests?.length || 0) >= 12) return;
    setForm({ ...form, interests: [...(form.interests || []), value] }); setInterest('');
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setPhotoBusy(true);
    const body = new FormData(); body.append('photo', file);
    try {
      await api.post('/laora/profile/photos', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { data } = await api.get('/laora/profile'); onSaved(data.data); notify('Foto adicionada.');
    } catch (error) { notify(messageOf(error), 'error'); } finally { setPhotoBusy(false); event.target.value = ''; }
  };

  const deletePhoto = async (id) => {
    if (!window.confirm('Remover esta foto do perfil?')) return;
    try {
      await api.delete(`/laora/profile/photos/${id}`); const { data } = await api.get('/laora/profile'); onSaved(data.data); notify('Foto removida.');
    } catch (error) { notify(messageOf(error), 'error'); }
  };

  const setPreferred = (value) => {
    const current = form.preferred_genders || [];
    setForm({ ...form, preferred_genders: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  return <div className="page-wrap profile-page">
    <div className="section-heading"><div><span className="eyebrow"><FiUser /> seu perfil</span><h1>Mostre quem você é</h1><p>Seus dados privados nunca são exibidos integralmente para outras pessoas.</p></div></div>
    <div className="profile-grid">
      <section className="panel photo-panel"><div className="panel-title"><div><h2>Fotos</h2><p>Adicione até 6. A primeira será sua foto principal.</p></div><label className={`upload-button ${photoBusy ? 'disabled' : ''}`}><FiCamera /> {photoBusy ? 'Enviando…' : 'Adicionar'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={photoBusy} /></label></div>
        <div className="photo-grid">{profile?.photos?.map((photo) => <div className="photo-tile" key={photo.id}><img src={photo.url} alt="Foto do perfil" />{photo.is_primary && <span>Principal</span>}<button type="button" aria-label="Remover foto" onClick={() => deletePhoto(photo.id)}><FiTrash2 /></button></div>)}{Array.from({ length: Math.max(0, 6 - (profile?.photos?.length || 0)) }, (_, i) => <div className="photo-placeholder" key={i}><FiCamera /></div>)}</div>
      </section>

      <form className="panel profile-form" onSubmit={save}>
        <div className="two-columns"><label>Nome exibido<input required minLength={2} maxLength={80} value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label><label>Data de nascimento<input required type="date" value={form.birthdate || ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></label></div>
        <div className="two-columns"><label>Gênero<select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Prefiro não informar</option><option value="woman">Mulher</option><option value="man">Homem</option><option value="non_binary">Não binário</option><option value="other">Outro</option></select></label><label>Orientação<select value={form.orientation || ''} onChange={(e) => setForm({ ...form, orientation: e.target.value })}><option value="">Prefiro não informar</option><option value="straight">Heterossexual</option><option value="gay">Homossexual</option><option value="bisexual">Bissexual</option><option value="pansexual">Pansexual</option><option value="other">Outra</option></select></label></div>
        <label>Sobre você<textarea rows={5} maxLength={800} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Conte um pouco sobre você, seus gostos e o tipo de conexão que procura." /></label>
        <div className="two-columns"><label>Cidade<input maxLength={120} value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label><label>UF<input maxLength={2} value={form.uf || ''} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></label></div>
        <div><span className="field-label">Interesses</span><div className="interest-input"><input value={interest} onChange={(e) => setInterest(e.target.value)} maxLength={40} placeholder="Ex.: música" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} /><button type="button" onClick={addInterest}>Adicionar</button></div><div className="chips">{(form.interests || []).map((item) => <button type="button" className="chip" key={item} onClick={() => setForm({ ...form, interests: form.interests.filter((value) => value !== item) })}>{item} <FiX /></button>)}</div></div>
        <div><span className="field-label">Quero conhecer</span><div className="choice-row">{[['woman','Mulheres'],['man','Homens'],['non_binary','Não binários'],['other','Outros']].map(([value, label]) => <button type="button" key={value} className={(form.preferred_genders || []).includes(value) ? 'choice active' : 'choice'} onClick={() => setPreferred(value)}>{(form.preferred_genders || []).includes(value) && <FiCheck />} {label}</button>)}</div></div>
        <div className="three-columns"><label>Idade mínima<input type="number" min="18" max="99" value={form.age_min} onChange={(e) => setForm({ ...form, age_min: Number(e.target.value) })} /></label><label>Idade máxima<input type="number" min="18" max="99" value={form.age_max} onChange={(e) => setForm({ ...form, age_max: Number(e.target.value) })} /></label><label>Distância máxima<input type="number" min="1" max="500" value={form.max_distance_km} onChange={(e) => setForm({ ...form, max_distance_km: Number(e.target.value) })} /><small>km</small></label></div>
        <label className="toggle-row"><input type="checkbox" checked={Boolean(form.discovery_enabled)} onChange={(e) => setForm({ ...form, discovery_enabled: e.target.checked })} /><span><strong>Mostrar meu perfil na descoberta</strong><small>Você pode pausar sua visibilidade quando quiser.</small></span></label>
        <button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button>
      </form>
    </div>
  </div>;
}

function Discovery({ profiles, busy, onSwipe, onReload, onReport }) {
  const current = profiles[0];
  if (busy) return <Loading label="Buscando pessoas compatíveis…" />;
  if (!current) return <Empty icon={<FiStar />} title="Você chegou ao fim por enquanto" text="Novas pessoas podem aparecer conforme seus filtros e sua região." action={<button className="secondary-button" onClick={onReload}><FiRefreshCw /> Atualizar descoberta</button>} />;
  const photo = current.photos?.[0]?.url;
  return <div className="discover-layout">
    <div className="discover-intro"><span className="eyebrow"><FiStar /> descobrir</span><h1>Uma pessoa de cada vez.</h1><p>Curta quando houver interesse real. O match só acontece se for recíproco.</p></div>
    <article className="dating-card">
      <div className="dating-photo">{photo ? <img src={photo} alt={current.display_name} /> : <div className="profile-fallback">{current.display_name?.[0] || '?'}</div>}<div className="photo-gradient" /><div className="card-title"><h2>{current.display_name}, <span>{current.age}</span></h2><p><FiMapPin /> {[current.city, current.uf].filter(Boolean).join(' • ') || 'Localização não informada'}{current.distance_km != null ? ` • ${current.distance_km} km` : ''}</p></div></div>
      <div className="dating-details"><p>{current.bio || 'Ainda sem descrição.'}</p><div className="chips">{current.interests?.map((item) => <span className="chip static" key={item}>{item}</span>)}</div><button className="report-link" type="button" onClick={() => onReport(current)}><FiFlag /> Denunciar ou bloquear</button></div>
      <div className="swipe-actions"><button className="round-button pass" onClick={() => onSwipe(current.user_id, 'pass')} aria-label="Passar"><FiX /></button><button className="round-button like" onClick={() => onSwipe(current.user_id, 'like')} aria-label="Curtir"><FiHeart /></button></div>
    </article>
  </div>;
}

function Matches({ matches, onOpen, onReload }) {
  if (!matches.length) return <Empty icon={<FiHeart />} title="Seus matches aparecerão aqui" text="Quando duas pessoas se curtirem, o match fica visível imediatamente para ambas." action={<button className="secondary-button" onClick={onReload}><FiRefreshCw /> Atualizar</button>} />;
  return <div className="page-wrap"><div className="section-heading"><div><span className="eyebrow"><FiHeart /> matches</span><h1>Conexões recíprocas</h1><p>Nenhum match formado é escondido atrás de assinatura.</p></div></div><div className="match-grid">{matches.map((match) => <button className="match-card" key={match.id} onClick={() => onOpen(match)}><div className="match-avatar">{match.profile?.photos?.[0]?.url ? <img src={match.profile.photos[0].url} alt="" /> : match.profile?.display_name?.[0]}</div><div><strong>{match.profile?.display_name}</strong><span>{match.last_message?.body || 'Vocês deram match. Diga oi 👋'}</span></div>{match.unread_count > 0 && <b>{match.unread_count}</b>}</button>)}</div></div>;
}

function Chat({ match, messages, busy, onBack, onSend, onUnmatch, onSafety }) {
  const [text, setText] = useState('');
  const submit = async (event) => { event.preventDefault(); if (!text.trim() || busy) return; const sent = await onSend(text.trim()); if (sent) setText(''); };
  return <div className="chat-shell"><header className="chat-header"><button type="button" onClick={onBack}><FiChevronLeft /></button><div className="chat-person"><div className="chat-avatar">{match.profile?.photos?.[0]?.url ? <img src={match.profile.photos[0].url} alt="" /> : match.profile?.display_name?.[0]}</div><div><strong>{match.profile?.display_name}</strong><small>Match desde {new Date(match.matched_at).toLocaleDateString('pt-BR')}</small></div></div><div className="chat-actions"><button title="Segurança" type="button" onClick={() => onSafety(match.profile)}><FiShield /></button><button title="Desfazer match" type="button" onClick={() => onUnmatch(match.id)}><FiSlash /></button></div></header><div className="messages">{messages.length ? messages.map((message) => <div key={message.id} className={`message ${message.sender_user_id === Number(JSON.parse(localStorage.getItem('user') || '{}').id) ? 'mine' : ''}`}><p>{message.body}</p><small>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="chat-empty"><FiHeart /><strong>Vocês deram match!</strong><span>Comece com uma conversa respeitosa.</span></div>}</div><form className="message-form" onSubmit={submit}><textarea rows={1} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem…" /><button disabled={busy || !text.trim()}><FiSend /></button></form></div>;
}

function SafetyModal({ person, onClose, onBlock, onReport }) {
  const [reason, setReason] = useState('comportamento_inadequado');
  const [details, setDetails] = useState('');
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true"><div className="modal-title"><div><span className="eyebrow"><FiShield /> segurança</span><h2>{person?.display_name}</h2></div><button onClick={onClose}><FiX /></button></div><p>Bloquear remove a pessoa da sua descoberta e encerra interações. Uma denúncia também vai para análise de moderação.</p><label>Motivo<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="comportamento_inadequado">Comportamento inadequado</option><option value="assedio">Assédio</option><option value="perfil_falso">Perfil falso</option><option value="spam">Spam ou golpe</option><option value="conteudo_improprio">Conteúdo impróprio</option><option value="menor_de_idade">Suspeita de menor de idade</option><option value="outro">Outro</option></select></label><label>Detalhes opcionais<textarea rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></label><div className="modal-actions"><button className="danger-outline" onClick={() => onBlock(person.user_id)}><FiSlash /> Apenas bloquear</button><button className="danger-button" onClick={() => onReport(person.user_id, reason, details)}><FiFlag /> Denunciar e bloquear</button></div></div></div>;
}

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [tab, setTab] = useState('discover');
  const [discovery, setDiscovery] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [safetyPerson, setSafetyPerson] = useState(null);

  const notify = useCallback((text, type = 'success') => {
    setNotice({ text, type }); window.clearTimeout(window.__laoraToast); window.__laoraToast = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const clearSession = useCallback(() => {
    ['token','access_token','auth_token','user'].forEach((key) => localStorage.removeItem(key));
    setToken(null); setUser(null); setProfile(null); setProfileLoaded(false); setMatches([]); setDiscovery([]); setSelectedMatch(null);
  }, []);

  const loadSession = useCallback(async () => {
    const stored = localStorage.getItem('token');
    setToken(stored);
    if (!stored) return;
    try {
      const [meResponse, profileResponse] = await Promise.all([api.get('/auth/me'), api.get('/laora/profile')]);
      const me = meResponse.data?.user || meResponse.data?.data || meResponse.data;
      if (me?.id) { localStorage.setItem('user', JSON.stringify(me)); setUser(me); }
      setProfile(profileResponse.data?.data || null); setProfileLoaded(true);
    } catch (error) {
      if (error?.response?.status === 401) clearSession(); else { setProfileLoaded(true); notify(messageOf(error), 'error'); }
    }
  }, [clearSession, notify]);

  useEffect(() => { loadSession(); const handler = () => loadSession(); window.addEventListener('authChanged', handler); return () => window.removeEventListener('authChanged', handler); }, [loadSession]);

  const loadDiscovery = useCallback(async () => {
    if (!token || !profile?.is_complete) return;
    setDiscoveryBusy(true);
    try { const { data } = await api.get('/laora/discover'); setDiscovery(data.data || []); }
    catch (error) { notify(messageOf(error), 'error'); }
    finally { setDiscoveryBusy(false); }
  }, [notify, profile?.is_complete, token]);

  const loadMatches = useCallback(async () => {
    if (!token || !profile?.is_complete) return;
    try { const { data } = await api.get('/laora/matches'); setMatches(data.data || []); }
    catch (error) { notify(messageOf(error), 'error'); }
  }, [notify, profile?.is_complete, token]);

  useEffect(() => { if (profile?.is_complete) { loadDiscovery(); loadMatches(); } }, [profile?.is_complete, loadDiscovery, loadMatches]);

  const swipe = async (targetUserId, action) => {
    setBusy(true);
    try {
      const { data } = await api.post('/laora/swipes', { target_user_id: targetUserId, action });
      setDiscovery((items) => items.filter((item) => item.user_id !== targetUserId));
      if (data.data?.matched) { notify('Deu match! A conexão já está visível para vocês dois. 💗'); await loadMatches(); }
    } catch (error) { notify(messageOf(error), 'error'); } finally { setBusy(false); }
  };

  const openChat = async (match) => {
    setSelectedMatch(match); setTab('chat'); setBusy(true);
    try { const { data } = await api.get(`/laora/matches/${match.id}/messages`); setMessages(data.data || []); await loadMatches(); }
    catch (error) { notify(messageOf(error), 'error'); } finally { setBusy(false); }
  };

  const send = async (text) => {
    if (!selectedMatch) return false; setBusy(true);
    try { const { data } = await api.post(`/laora/matches/${selectedMatch.id}/messages`, { body: text }); setMessages((items) => [...items, data.data]); return true; }
    catch (error) { notify(messageOf(error), 'error'); return false; } finally { setBusy(false); }
  };

  const unmatch = async (id) => {
    if (!window.confirm('Desfazer este match? A conversa será encerrada.')) return;
    try { await api.delete(`/laora/matches/${id}`); setSelectedMatch(null); setTab('matches'); await loadMatches(); notify('Match desfeito.'); }
    catch (error) { notify(messageOf(error), 'error'); }
  };

  const block = async (targetUserId) => {
    try { await api.post(`/laora/users/${targetUserId}/block`, { reason: 'user_request' }); setSafetyPerson(null); setDiscovery((items) => items.filter((item) => item.user_id !== targetUserId)); setSelectedMatch(null); setTab('discover'); await loadMatches(); notify('Usuário bloqueado.'); }
    catch (error) { notify(messageOf(error), 'error'); }
  };

  const report = async (targetUserId, reason, details) => {
    try { await api.post('/laora/reports', { reported_user_id: targetUserId, match_id: selectedMatch?.profile?.user_id === targetUserId ? selectedMatch.id : undefined, reason, details, block_user: true }); setSafetyPerson(null); setDiscovery((items) => items.filter((item) => item.user_id !== targetUserId)); setSelectedMatch(null); setTab('discover'); await loadMatches(); notify('Denúncia recebida. A pessoa também foi bloqueada.'); }
    catch (error) { notify(messageOf(error), 'error'); }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* local logout remains safe */ }
    clearSession();
  };

  const navItems = useMemo(() => [
    ['discover', <FiStar key="i" />, 'Descobrir'], ['matches', <FiHeart key="i" />, 'Matches'], ['profile', <FiUser key="i" />, 'Perfil'],
  ], []);

  if (!token) return <AuthScreen onAuthenticated={loadSession} />;
  if (!profileLoaded) return <div className="gateway-screen"><Brand /><Loading label="Preparando o Laora…" /></div>;
  if (!profile?.is_complete && tab !== 'profile') setTimeout(() => setTab('profile'), 0);

  return <div className="app-shell">
    <header className="topbar"><Brand /><div className="top-actions"><span className="trust"><FiShield /> conexões transparentes</span><button type="button" className="icon-button" title="Perfil" onClick={() => setTab('profile')}><FiSettings /></button><button type="button" className="icon-button" title="Sair" onClick={logout}><FiLogOut /></button></div></header>
    <main className="app-main">
      {tab === 'discover' && <Discovery profiles={discovery} busy={discoveryBusy || busy} onSwipe={swipe} onReload={loadDiscovery} onReport={setSafetyPerson} />}
      {tab === 'matches' && <Matches matches={matches} onOpen={openChat} onReload={loadMatches} />}
      {tab === 'profile' && <ProfileEditor profile={profile} onSaved={(value) => { setProfile(value); if (value?.is_complete) loadDiscovery(); }} notify={notify} />}
      {tab === 'chat' && selectedMatch && <Chat match={selectedMatch} messages={messages} busy={busy} onBack={() => setTab('matches')} onSend={send} onUnmatch={unmatch} onSafety={setSafetyPerson} />}
    </main>
    {tab !== 'chat' && <nav className="bottom-nav">{navItems.map(([value, icon, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{icon}<span>{label}</span>{value === 'matches' && matches.reduce((sum, item) => sum + (item.unread_count || 0), 0) > 0 && <b>{matches.reduce((sum, item) => sum + (item.unread_count || 0), 0)}</b>}</button>)}</nav>}
    <footer>Uma plataforma <a href="https://petertecnet.com.br">Peter Tecnet</a> • Uso exclusivo para maiores de 18 anos</footer>
    {notice && <div className={`toast ${notice.type}`}>{notice.type === 'error' ? <FiX /> : <FiCheck />}<span>{notice.text}</span></div>}
    {safetyPerson && <SafetyModal person={safetyPerson} onClose={() => setSafetyPerson(null)} onBlock={block} onReport={report} />}
  </div>;
}

export default function App() {
  return <PeterAccountGateway apiBaseUrl={API_BASE} appSlug={APP_SLUG}><AppContent /></PeterAccountGateway>;
}
