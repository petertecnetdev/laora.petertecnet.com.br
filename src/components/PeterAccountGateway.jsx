/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";

const SDK_VERSION = "2.0.0";
const INSIGHTS_VERSION = "1.0.0";
const SDK_URL = `https://petertecnet.com.br/ecosystem/peter-ecosystem.js?v=${SDK_VERSION}`;
const INSIGHTS_URL = `https://petertecnet.com.br/ecosystem/peter-insights.js?v=${INSIGHTS_VERSION}`;
let sdkPromise;
let insightsPromise;

function loadScript({ selector, src, datasetKey, datasetValue, ready, errorMessage }) {
  if (ready()) return Promise.resolve();
  const existing = document.querySelector(selector);
  if (existing) {
    return new Promise((resolve, reject) => {
      if (ready()) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(errorMessage)), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset[datasetKey] = datasetValue;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error(errorMessage)), { once: true });
    document.head.appendChild(script);
  });
}

function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = loadScript({
      selector: "script[data-peter-ecosystem-sdk]",
      src: SDK_URL,
      datasetKey: "peterEcosystemSdk",
      datasetValue: SDK_VERSION,
      ready: () => Boolean(customElements.get("peter-ecosystem-launcher")),
      errorMessage: "Não foi possível carregar o Peter Tecnet Ecosystem SDK.",
    });
  }
  return sdkPromise;
}

function loadInsights() {
  if (!insightsPromise) {
    insightsPromise = loadScript({
      selector: "script[data-peter-insights-sdk]",
      src: INSIGHTS_URL,
      datasetKey: "peterInsightsSdk",
      datasetValue: INSIGHTS_VERSION,
      ready: () => Boolean(customElements.get("peter-insight-chart")),
      errorMessage: "Não foi possível carregar o Peter Tecnet Insights SDK.",
    });
  }
  return insightsPromise;
}

export default function PeterAccountGateway({ apiBaseUrl, appSlug, children }) {
  const hostRef = useRef(null);
  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    Promise.all([loadSdk(), loadInsights()]).then(() => {
      if (!active || !host) return;
      const launcher = document.createElement("peter-ecosystem-launcher");
      launcher.setAttribute("api-base", apiBaseUrl || "https://api.petertecnet.com.br/api");
      launcher.setAttribute("app-slug", appSlug || "");
      launcher.setAttribute("sdk-version", SDK_VERSION);
      host.replaceChildren(launcher);
    }).catch((error) => console.error("[Peter Tecnet Ecosystem]", error));
    return () => { active = false; host?.replaceChildren(); };
  }, [apiBaseUrl, appSlug]);
  return <>{children}<span ref={hostRef} style={{ display: "contents" }} /></>;
}
