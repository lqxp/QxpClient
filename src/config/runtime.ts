function normalizedStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

const DEFAULT_SERVER_ORIGIN = "https://qxp.kisakay.com";

const rawRuntime = window.__QXP_RUNTIME__ || {};
const rawRtc = rawRuntime.rtc || {};

function normalizeHttpUrl(value: unknown) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) return "";

  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function normalizeWebSocketUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function isEmbeddedAppOrigin() {
  return window.location.protocol !== "http:" && window.location.protocol !== "https:";
}

function webSocketUrlFromHttpBase(httpBaseUrl: string) {
  try {
    const url = new URL(httpBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function joinBasePath(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBase).toString();
}

const serverOrigin = normalizeHttpUrl(rawRuntime.serverOrigin)
  || normalizeHttpUrl(import.meta.env.VITE_QXP_SERVER_ORIGIN)
  || (isEmbeddedAppOrigin() ? DEFAULT_SERVER_ORIGIN : normalizeHttpUrl(window.location.origin));

const apiBaseUrl = normalizeHttpUrl(rawRuntime.apiBaseUrl)
  || normalizeHttpUrl(import.meta.env.VITE_QXP_API_BASE_URL)
  || serverOrigin;

const wsUrl = normalizeWebSocketUrl(rawRuntime.wsUrl)
  || normalizeWebSocketUrl(import.meta.env.VITE_QXP_WS_URL)
  || webSocketUrlFromHttpBase(apiBaseUrl);

export const rtcRuntimeConfig = {
  relayOnly: rawRtc.relayOnly !== false,
  turnUrls: normalizedStringArray(rawRtc.turnUrls),
  turnUsername: String(rawRtc.turnUsername || "").trim(),
  turnCredential: String(rawRtc.turnCredential || "").trim(),
  callsEnabled: Boolean(rawRtc.callsEnabled),
  callsUnavailableReason: String(rawRtc.callsUnavailableReason || "").trim()
};

export const appRuntimeConfig = {
  serverOrigin,
  apiBaseUrl,
  wsUrl
};

export function apiUrl(path: string) {
  return joinBasePath(apiBaseUrl, path);
}
