const API_BASE_URL = "http://localhost:3001";
const AUTO_SCAN_COOLDOWN_MS = 60 * 1000;
const DOM_CONTENT_LIMIT = 450000;

let activeScan = null;
const recentAutoScans = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("Extension background error:", error);
      sendResponse({
        success: false,
        error: error.message || "Nieznany błąd w tle rozszerzenia."
      });
    });

  return true;
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case "pageLoaded":
      return handlePageLoaded(message.data, sender);
    case "startBackendScan":
      return startBackendScan(message.data, { manual: true });
    case "login":
      return login(message.data);
    case "logout":
      return logout();
    case "getAuthState":
      return getAuthState();
    case "getLatestScan":
      return getLatestScan();
    case "submittedData":
      return reportSubmittedData(message.data);
    default:
      return undefined;
  }
}

async function handlePageLoaded(data, sender) {
  if (!data || !isScannableUrl(data.url)) {
    return { success: false, skipped: true };
  }

  const auth = await getStoredAuth();
  if (!auth.accessToken) {
    await setStatus("Zaloguj się we wtyczce, żeby automatycznie sprawdzać strony.");
    return { success: false, skipped: true, error: "Brak tokenu logowania." };
  }

  const tabId = sender.tab?.id || "unknown";
  const cacheKey = tabId + ":" + normalizeForCooldown(data.url);
  const lastScanTime = recentAutoScans.get(cacheKey) || 0;

  if (Date.now() - lastScanTime < AUTO_SCAN_COOLDOWN_MS) {
    return { success: false, skipped: true };
  }

  recentAutoScans.set(cacheKey, Date.now());
  trimRecentAutoScans();

  return startBackendScan(data, { manual: false });
}

async function startBackendScan(data, options = {}) {
  if (!data || !isScannableUrl(data.url)) {
    throw new Error("Tej strony nie da się sprawdzić przez rozszerzenie.");
  }

  if (activeScan) {
    return {
      success: false,
      error: "Analiza już trwa. Poczekaj, aż poprzednia się zakończy."
    };
  }

  activeScan = runBackendScan(data, options);

  try {
    const result = await activeScan;
    return {
      success: true,
      result
    };
  } catch (error) {
    await setStatus("Błąd skanowania: " + (error.message || "nieznany błąd"));
    throw error;
  } finally {
    activeScan = null;
  }
}

async function runBackendScan(data, options) {
  const url = data.url;
  const domContent = String(data.domContent || "").slice(0, DOM_CONTENT_LIMIT);
  const modeLabel = options.manual ? "Ręcznie sprawdzam stronę" : "Automatycznie sprawdzam stronę";

  await setStatus(modeLabel + " w backendzie...");

  const result = await apiFetch("/api/scan", {
    method: "POST",
    body: {
      url,
      dom_content: domContent
    }
  });

  const status = formatScanStatus(result);

  await chrome.storage.local.set({
    analyzeStatus: status,
    lastBackendScanResult: result,
    lastBackendScanUrl: url,
    lastBackendScanAt: new Date().toISOString()
  });

  return result;
}

async function login(data) {
  const email = String(data?.email || "").trim();
  const password = String(data?.password || "");

  if (!email || !password) {
    throw new Error("Podaj email i hasło.");
  }

  await setStatus("Loguję do backendu...");

  const response = await rawApiFetch("/api/auth/login", {
    method: "POST",
    body: {
      email,
      password
    }
  });

  await chrome.storage.local.set({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenExpiresAt: Date.now() + response.expires_in * 1000,
    userEmail: response.user?.email || email
  });

  await setStatus("Zalogowano. Automatyczne skanowanie jest aktywne.");

  return {
    success: true,
    email: response.user?.email || email
  };
}

async function logout() {
  const auth = await getStoredAuth();

  if (auth.accessToken) {
    try {
      await rawApiFetch("/api/auth/logout", {
        method: "POST",
        token: auth.accessToken
      });
    } catch (error) {
      console.warn("Logout request failed:", error);
    }
  }

  await chrome.storage.local.remove([
    "accessToken",
    "refreshToken",
    "tokenExpiresAt",
    "userEmail"
  ]);

  await setStatus("Wylogowano.");

  return { success: true };
}

async function getAuthState() {
  const auth = await getStoredAuth();

  return {
    success: true,
    loggedIn: Boolean(auth.accessToken),
    email: auth.userEmail || null
  };
}

async function reportSubmittedData(data) {
  if (!data || !data.site_url || !Array.isArray(data.data_categories) || !data.data_categories.length) {
    return { success: false, skipped: true };
  }

  try {
    await apiFetch("/api/submitted-data", {
      method: "POST",
      body: {
        site_url: data.site_url,
        data_categories: data.data_categories
      }
    });
    return { success: true };
  } catch (error) {
    console.warn("Nie zapisano logu przekazanych danych:", error);
    return { success: false, error: error.message || "Błąd zapisu" };
  }
}

async function getLatestScan() {
  const data = await chrome.storage.local.get([
    "analyzeStatus",
    "lastBackendScanResult",
    "lastBackendScanUrl",
    "lastBackendScanAt"
  ]);

  return {
    success: true,
    status: data.analyzeStatus || "Gotowe do działania.",
    result: data.lastBackendScanResult || null,
    url: data.lastBackendScanUrl || null,
    scannedAt: data.lastBackendScanAt || null
  };
}

async function apiFetch(path, options = {}) {
  let auth = await getStoredAuth();

  if (!auth.accessToken) {
    throw new Error("Brak logowania. Zaloguj się we wtyczce.");
  }

  if (auth.refreshToken && auth.tokenExpiresAt && Date.now() > auth.tokenExpiresAt - 60000) {
    auth = await refreshAuth(auth.refreshToken);
  }

  try {
    return await rawApiFetch(path, {
      ...options,
      token: auth.accessToken
    });
  } catch (error) {
    if (error.status !== 401 || !auth.refreshToken) {
      throw error;
    }

    auth = await refreshAuth(auth.refreshToken);

    return rawApiFetch(path, {
      ...options,
      token: auth.accessToken
    });
  }
}

async function refreshAuth(refreshToken) {
  const response = await rawApiFetch("/api/auth/refresh", {
    method: "POST",
    body: {
      refresh_token: refreshToken
    }
  });

  const auth = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenExpiresAt: Date.now() + response.expires_in * 1000
  };

  await chrome.storage.local.set(auth);

  return auth;
}

async function rawApiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = "Bearer " + options.token;
  }

  const response = await fetch(API_BASE_URL + path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const error = new Error(json?.error || text || "Backend zwrócił błąd HTTP " + response.status);
    error.status = response.status;
    error.details = json?.details;
    throw error;
  }

  return json;
}

async function getStoredAuth() {
  const data = await chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "tokenExpiresAt",
    "userEmail"
  ]);

  return {
    accessToken: data.accessToken || null,
    refreshToken: data.refreshToken || null,
    tokenExpiresAt: data.tokenExpiresAt || 0,
    userEmail: data.userEmail || null
  };
}

async function setStatus(status) {
  await chrome.storage.local.set({
    analyzeStatus: status
  });
}

function formatScanStatus(result) {
  const cacheText = result.cached ? "wynik z cache" : "nowa analiza";
  const partialText = result.partial ? ", wynik częściowy" : "";
  const summary = result.summary ? "\n\n" + result.summary : "";

  return (
    "Gotowe: " +
    result.verdict +
    " (" +
    result.score +
    "/100, " +
    cacheText +
    partialText +
    ")" +
    summary
  );
}

function isScannableUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeForCooldown(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function trimRecentAutoScans() {
  if (recentAutoScans.size < 200) return;

  const cutoff = Date.now() - 10 * AUTO_SCAN_COOLDOWN_MS;

  for (const [key, time] of recentAutoScans.entries()) {
    if (time < cutoff) {
      recentAutoScans.delete(key);
    }
  }
}
