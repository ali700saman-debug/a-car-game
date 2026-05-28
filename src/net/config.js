// Multiplayer server URL configuration.
// - Local dev: http://localhost:3000
// - Production: set MULTIPLAYER_SERVER_PROD_URL below (or override via localStorage in UI)

export const MULTIPLAYER_SERVER_LOCAL_URL = "http://localhost:3000";
export const MULTIPLAYER_SERVER_PROD_URL = ""; // e.g. "https://your-server.onrender.com"

export function getDefaultMultiplayerServerUrl() {
  // If hosted (non-localhost), prefer PROD if provided; otherwise fall back to LOCAL.
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal && MULTIPLAYER_SERVER_PROD_URL) return MULTIPLAYER_SERVER_PROD_URL;
  return MULTIPLAYER_SERVER_LOCAL_URL;
}

