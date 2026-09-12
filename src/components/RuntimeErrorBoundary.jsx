import React from 'react';

const RECOVERY_KEY = 'laora_runtime_recovery_attempted';

export default class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    window.dispatchEvent(new CustomEvent('peter:runtime-error', {
      detail: {
        application: 'laora',
        message: error?.message || 'render_error',
        componentStack: info?.componentStack || '',
      },
    }));
  }

  recover = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
    } catch {
      // Recovery must remain available even when the service worker API fails.
    }

    sessionStorage.setItem(RECOVERY_KEY, '1');
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const alreadyRetried = sessionStorage.getItem(RECOVERY_KEY) === '1';
    return (
      <main className="p-auth" role="alert">
        <section className="p-auth-hero">
          <div>
            <span className="p-eyebrow">recuperação segura</span>
            <h1>O Laora encontrou um problema.</h1>
            <p>Sua sessão foi preservada. Você pode recarregar a versão mais recente sem refazer seu cadastro.</p>
          </div>
        </section>
        <section className="p-auth-panel">
          <div className="p-card p-auth-card">
            <h2>{alreadyRetried ? 'Ainda não voltou?' : 'Recuperar aplicativo'}</h2>
            <p>{alreadyRetried ? 'Tente novamente. Se o problema continuar, seus dados permanecem preservados no servidor.' : 'Vamos atualizar os recursos do aplicativo e tentar novamente.'}</p>
            <button type="button" className="p-primary" onClick={this.recover}>Tentar novamente</button>
          </div>
        </section>
      </main>
    );
  }
}
