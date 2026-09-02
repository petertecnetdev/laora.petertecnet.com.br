import { useState } from 'react';
import { FiHeart, FiMessageCircle, FiUser, FiX, FiShield, FiMapPin, FiSparkles } from 'react-icons/fi';

const profiles = [
  { id: 1, name: 'Marina', age: 27, city: 'Goiânia', bio: 'Música, viagens e café sem pressa.', tags: ['Música', 'Viagens', 'Café'] },
  { id: 2, name: 'Lucas', age: 29, city: 'Anápolis', bio: 'Gosto de conversa boa, cinema e estrada.', tags: ['Cinema', 'Road trips', 'Gastronomia'] },
  { id: 3, name: 'Ana', age: 25, city: 'Goiânia', bio: 'Fotografia, shows e descobrir lugares novos.', tags: ['Fotografia', 'Shows', 'Arte'] },
];

export default function App() {
  const [index, setIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const profile = profiles[index % profiles.length];
  const next = () => setIndex((value) => value + 1);
  const like = () => {
    setMatches((value) => [...value, profile]);
    next();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="mark"><span /></span>
          <strong>Laora</strong>
        </a>
        <div className="trust"><FiShield /> Conexões transparentes</div>
      </header>

      <main>
        <section className="hero-copy">
          <span className="eyebrow"><FiSparkles /> Conexões reais, sem mistério</span>
          <h1>Conheça pessoas.<br/><em>Veja quando der match.</em></h1>
          <p>No Laora, um match recíproco é seu. Nada de esconder quem também curtiu você atrás de uma assinatura.</p>
        </section>

        <section className="discover">
          <article className="profile-card">
            <div className="portrait">
              <div className="avatar">{profile.name[0]}</div>
              <span className="online">online</span>
            </div>
            <div className="profile-content">
              <h2>{profile.name}, <span>{profile.age}</span></h2>
              <p className="location"><FiMapPin /> {profile.city}</p>
              <p>{profile.bio}</p>
              <div className="tags">{profile.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
          </article>

          <div className="actions">
            <button className="pass" onClick={next} aria-label="Passar"><FiX /></button>
            <button className="like" onClick={like} aria-label="Curtir"><FiHeart /></button>
          </div>
        </section>

        <section className="principles">
          <div><FiHeart/><strong>Match visível</strong><span>Se os dois curtiram, os dois sabem.</span></div>
          <div><FiShield/><strong>Moderação clara</strong><span>Bloqueios com motivo e fluxo de recurso.</span></div>
          <div><FiMessageCircle/><strong>Conversa direta</strong><span>O chat nasce do match, sem truques.</span></div>
        </section>
      </main>

      <nav className="bottom-nav">
        <button className="active"><FiSparkles/><span>Descobrir</span></button>
        <button><FiHeart/><span>Matches</span><b>{matches.length}</b></button>
        <button><FiMessageCircle/><span>Conversas</span></button>
        <button><FiUser/><span>Perfil</span></button>
      </nav>

      <footer>Uma plataforma <a href="https://petertecnet.com.br">Peter Tecnet</a></footer>
    </div>
  );
}
