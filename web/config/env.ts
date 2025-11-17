const BACKEND_HTTP =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const FALLBACK_WS = BACKEND_HTTP.replace(/^http/, "ws").replace(/\/$/, "");
const BACKEND_WS =
  process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? `${FALLBACK_WS}/ws/news`;

export const env = {
  backendHttpUrl: BACKEND_HTTP,
  backendWsUrl: BACKEND_WS,
};
