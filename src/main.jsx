import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import PeterAccountGateway from './components/PeterAccountGateway';
import { installGlobalImageFallbacks } from './utils/imageFallback';
import { installPasswordVisibilityToggles } from './utils/passwordVisibility';
import './styles.css';
import './nexus-mobile-nav.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';

installGlobalImageFallbacks();
installPasswordVisibilityToggles();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PeterAccountGateway apiBaseUrl={API_BASE_URL} appSlug={APP_SLUG}>
        <App />
      </PeterAccountGateway>
    </BrowserRouter>
  </React.StrictMode>
);
