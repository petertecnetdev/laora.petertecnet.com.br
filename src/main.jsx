import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import GlobalImageInputEnhancer from './components/GlobalImageInputEnhancer';
import PeterAccountGateway from './components/PeterAccountGateway';
import PwaInstallButton from './components/PwaInstallButton';
import RuntimeErrorBoundary from './components/RuntimeErrorBoundary';
import { installGlobalImageFallbacks } from './utils/imageFallback';
import { installPasswordVisibilityToggles } from './utils/passwordVisibility';
import { installPeterWhatsappFallback } from './utils/peterWhatsappFallback';
import { installDiscoveryRecovery } from './utils/discoveryRecovery';
import { installAcquisitionAttribution } from './utils/acquisitionAttribution';
import { installProfileActivationGuide } from './utils/profileActivation';
import { installChunkRecovery } from './utils/chunkRecovery';
import { installRuntimeReliabilityTelemetry } from './utils/runtimeReliability';
import { installOrganicReferralLoop } from './utils/organicReferral';
import { installAuthDeepLinks } from './utils/authDeepLinks';
import { installRouteSeo } from './utils/routeSeo';
import './styles.css';
import './nexus-mobile-nav.css';
import './processing.css';
import './conversion.css';
import './pwa-install.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'laora';

installGlobalImageFallbacks();
installPasswordVisibilityToggles();
installPeterWhatsappFallback();
installDiscoveryRecovery();
installAcquisitionAttribution();
installProfileActivationGuide();
installChunkRecovery();
installRuntimeReliabilityTelemetry();
installOrganicReferralLoop();
installAuthDeepLinks();
installRouteSeo();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RuntimeErrorBoundary>
      <BrowserRouter>
        <PeterAccountGateway apiBaseUrl={API_BASE_URL} appSlug={APP_SLUG}>
          <App />
          <GlobalImageInputEnhancer />
          <PwaInstallButton />
        </PeterAccountGateway>
      </BrowserRouter>
    </RuntimeErrorBoundary>
  </React.StrictMode>
);
