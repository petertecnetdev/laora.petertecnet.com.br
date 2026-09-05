/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";

const SDK_VERSION = "3.0.0";
const TELEMETRY_VERSION = "3.1.0";
const SUBSCRIPTION_VERSION = "1.0.0";
const SDK_URL = `https://petertecnet.com.br/ecosystem/peter-ecosystem-v3.js?v=${SDK_VERSION}`;
const TELEMETRY_URL = `https://petertecnet.com.br/ecosystem/peter-telemetry-v3.js?v=${TELEMETRY_VERSION}`;
const SUBSCRIPTION_URL = `https://petertecnet.com.br/ecosystem/peter-subscriptions-v1.js?v=${SUBSCRIPTION_VERSION}`;
let sdkPromise;
let telemetryPromise;
let subscriptionPromise;

function loadTelemetry(apiBaseUrl, appSlug) {
  if (window.PeterTecnetTelemetry?.version === TELEMETRY_VERSION) {
    window.PeterTecnetTelemetry.start({ apiBaseUrl, appSlug });
    return Promise.resolve();
  }
  if (telemetryPromise) return telemetryPromise.then(() => window.PeterTecnetTelemetry?.start({ apiBaseUrl, appSlug }));
  telemetryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-peter-telemetry-sdk]");
    const ready = () => { window.PeterTecnetTelemetry?.start({ apiBaseUrl, appSlug }); resolve(); };
    if (existing) {
      if (window.PeterTecnetTelemetry) ready();
      else {
        existing.addEventListener("load", ready, { once: true });
        existing.addEventListener("error", () => reject(new Error("Não foi possível carregar a telemetria Peter Tecnet.")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = TELEMETRY_URL;
    script.async = true;
    script.dataset.peterTelemetrySdk = TELEMETRY_VERSION;
    script.dataset.appSlug = appSlug || "";
    script.dataset.apiBase = apiBaseUrl || "https://api.petertecnet.com.br/api";
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar a telemetria Peter Tecnet.")), { once: true });
    document.head.appendChild(script);
  });
  return telemetryPromise;
}

function loadSdk() {
  if (window.PeterTecnetEcosystem?.version === SDK_VERSION && customElements.get("peter-ecosystem-launcher")) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-peter-ecosystem-sdk]");
    if (existing) {
      if (customElements.get("peter-ecosystem-launcher")) resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Não foi possível carregar o Peter Tecnet Ecosystem SDK.")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.dataset.peterEcosystemSdk = SDK_VERSION;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar o Peter Tecnet Ecosystem SDK.")), { once: true });
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function loadSubscriptionSdk() {
  if (window.PeterTecnetSubscriptions?.version === SUBSCRIPTION_VERSION && customElements.get("peter-subscription-gate")) return Promise.resolve();
  if (subscriptionPromise) return subscriptionPromise;
  subscriptionPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-peter-subscription-sdk]");
    const ready = () => customElements.get("peter-subscription-gate") ? resolve() : reject(new Error("SDK de assinaturas carregou sem registrar o componente."));
    if (existing) {
      if (customElements.get("peter-subscription-gate")) resolve();
      else {
        existing.addEventListener("load", ready, { once: true });
        existing.addEventListener("error", () => reject(new Error("Não foi possível carregar as assinaturas Peter Tecnet.")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = SUBSCRIPTION_URL;
    script.async = true;
    script.dataset.peterSubscriptionSdk = SUBSCRIPTION_VERSION;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar as assinaturas Peter Tecnet.")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    subscriptionPromise = undefined;
    throw error;
  });
  return subscriptionPromise;
}

export default function PeterAccountGateway({ apiBaseUrl, appSlug, children }) {
  const hostRef = useRef(null);
  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    const api = apiBaseUrl || "https://api.petertecnet.com.br/api";
    loadTelemetry(api, appSlug || "")
      .catch((error) => console.error("[Peter Tecnet Telemetry]", error))
      .finally(() => Promise.all([loadSdk(), loadSubscriptionSdk()]).then(() => {
        if (!active || !host) return;
        const launcher = document.createElement("peter-ecosystem-launcher");
        launcher.setAttribute("api-base", api);
        launcher.setAttribute("app-slug", appSlug || "");
        launcher.setAttribute("sdk-version", SDK_VERSION);
        const subscriptionGate = document.createElement("peter-subscription-gate");
        subscriptionGate.setAttribute("api-base", api);
        subscriptionGate.setAttribute("app-slug", appSlug || "");
        host.replaceChildren(launcher, subscriptionGate);
      }).catch((error) => console.error("[Peter Tecnet Ecosystem]", error)));
    return () => { active = false; host?.replaceChildren(); };
  }, [apiBaseUrl, appSlug]);
  return <>{children}<span ref={hostRef} style={{ display: "contents" }} /></>;
}
