export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("access_token");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("refresh_token");
}

export function setTokens({ accessToken, refreshToken }) {
  if (typeof window === "undefined") return;
  if (accessToken) window.localStorage.setItem("access_token", accessToken);
  if (refreshToken) window.localStorage.setItem("refresh_token", refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("refresh_token");
}
