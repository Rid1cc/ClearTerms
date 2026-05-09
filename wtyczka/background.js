const GEMINI_API_KEY = "AIzaSyACt5rrm0wJpS8H4A1jEpNpUtsS-MLrw7Q";
const API_BASE_URL = "http://localhost:3001";

const JINA_COOLDOWN_MS = 30000;
const JINA_ERROR_COOLDOWN_MS = 120000;

let isWorking = false;
let lastJinaRequestTime = 0;
let activeAnalysisPage = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error("background.js error:", error);
      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});

async function handleMessage(message, sender) {
  if (message.action === "login") {
    return login(message.data);
  }

  if (message.action === "logout") {
    return logout();
  }

  if (message.action === "getAuthState") {
    return getAuthState();
  }

  if (message.action === "checkPhishingBlacklist") {
    return checkPhishingBlacklist(message.url);
  }

  if (message.action !== "startAnalyzeJob") {
    return undefined;
  }

  if (isWorking) {
    return {
      success: false,
      error: "There is an already ongoing analysis."
    };
  }

  runAnalyzeJob(message.data);

  return {
    success: true
  };
}

async function runAnalyzeJob(data) {
  isWorking = true;
  activeAnalysisPage = data.sourcePage || null;

  try {
    const cached = await checkBackendForExistingResult(data.sourcePage);

    if (cached && cached.success && cached.result && cached.result.cached && !cached.result.partial) {
      await chrome.storage.local.set({
        lastBackendScanResult: cached.result
      });

      await setStatus(
        "Our analysis result:\n" +
        cached.result.verdict +
        " (" +
        cached.result.score +
        "/100)\n\n" +
        (cached.result.summary || "")
      );
      return;
    }

    await setStatus("Acquiring privacy policy.");

    const policyText = await fetchWithJina(data.privacyUrl);

    console.log("===== PRIVACY POLICY TEXT FETCHED THROUGH JINA =====");
    console.log(policyText);
    console.log("===== END OF JINA TEXT =====");

    console.log("Jina text length:", policyText.length);

    await setStatus("Analysing the policy using machine learning technology.");

    const analysis = await analyzeWithGemini({
      sourcePage: data.sourcePage,
      privacyUrl: data.privacyUrl,
      policyText: policyText
    });

    await setStatus("The results are in, check them out by opening the extension again!");

    console.log("===== GEMINI ANALYSIS RESULT =====");
    console.log(analysis);
    console.log("===== END OF GEMINI ANALYSIS =====");

    await chrome.storage.local.set({
      lastAnalysisResult: analysis
    });

    await sendAnalysisToBackend({
      sourcePage: data.sourcePage,
      privacyUrl: data.privacyUrl,
      analysis: analysis
    });

    await setStatus("Ready!");
  } catch (error) {
    console.error("Analysis error:", error);
    await setStatus("Error: " + error.message);
  } finally {
    isWorking = false;
    activeAnalysisPage = null;
  }
}

async function login(data) {
  const email = String(data?.email || "").trim();
  const password = String(data?.password || "");

  if (!email || !password) {
    throw new Error("Log in by using an email and a password.");
  }

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

  await setStatus("Successfully logged in.");

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
      console.warn("Backend logout failed:", error);
    }
  }

  await chrome.storage.local.remove([
    "accessToken",
    "refreshToken",
    "tokenExpiresAt",
    "userEmail"
  ]);

  await setStatus("Successfully logged out.");

  return {
    success: true
  };
}

async function getAuthState() {
  const auth = await getStoredAuth();

  return {
    success: true,
    loggedIn: Boolean(auth.accessToken),
    email: auth.userEmail || null
  };
}

async function checkBackendForExistingResult(url) {
  try {
    const result = await apiFetch("/api/scan", {
      method: "POST",
      body: {
        url
      }
    });

    return {
      success: true,
      result
    };
  } catch (error) {
    console.warn("Backend check failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendAnalysisToBackend(payload) {
  await apiFetch("/api/scan/extension-result", {
    method: "POST",
    body: payload
  });
}

async function checkPhishingBlacklist(url) {
  if (!url) {
    return {
      success: false,
      blocked: false,
      error: "Missing URL."
    };
  }

  try {
    const result = await rawApiFetch("/api/scan/blacklist-check", {
      method: "POST",
      body: { url }
    });

    return {
      success: true,
      blocked: Boolean(result?.blocked),
      reason: result?.reason || null,
      source: result?.source || null
    };
  } catch (error) {
    console.warn("Phishing blacklist check failed:", error);
    return {
      success: false,
      blocked: false,
      error: error.message
    };
  }
}

async function apiFetch(path, options = {}) {
  let auth = await getStoredAuth();

  if (!auth.accessToken) {
    throw new Error("You have to log in to use the features.");
  }

  try {
    if (auth.refreshToken && auth.tokenExpiresAt && Date.now() > auth.tokenExpiresAt - 60000) {
      auth = await refreshAuth(auth.refreshToken);
    }

    return await rawApiFetch(path, {
      ...options,
      token: auth.accessToken
    });
  } catch (error) {
    if (error.status !== 401 || !auth.refreshToken) {
      throw error;
    }

    try {
      auth = await refreshAuth(auth.refreshToken);
    } catch (refreshError) {
      await clearStoredAuth();
      throw new Error("Session expired. Log in again in the extension.");
    }

    return rawApiFetch(path, {
      ...options,
      token: auth.accessToken
    });
  }
}

async function refreshAuth(refreshToken) {
  try {
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
  } catch (error) {
    await clearStoredAuth();
    throw new Error("Session expired. Log in again in the extension.");
  }
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
    const error = new Error(json?.error || text || "Backend returned HTTP error " + response.status);
    error.status = response.status;
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

async function clearStoredAuth() {
  await chrome.storage.local.remove([
    "accessToken",
    "refreshToken",
    "tokenExpiresAt",
    "userEmail"
  ]);
}

async function fetchWithJina(url) {
  const cacheKey = makeCacheKey(url);
  const errorCooldownKey = "jina_error_cooldown_until";

  const cachedData = await chrome.storage.local.get(cacheKey);

  if (cachedData[cacheKey]) {
    await setStatus("Using the cached policy...");
    return cachedData[cacheKey];
  }

  const cooldownData = await chrome.storage.local.get(errorCooldownKey);
  const cooldownUntil = cooldownData[errorCooldownKey] || 0;

  if (Date.now() < cooldownUntil) {
    const secondsLeft = Math.ceil((cooldownUntil - Date.now()) / 1000);
    throw new Error("Jina is temporarily blocked. Try again in " + secondsLeft + " seconds.");
  }

  const timeFromLastRequest = Date.now() - lastJinaRequestTime;

  if (timeFromLastRequest < JINA_COOLDOWN_MS) {
    const waitTime = JINA_COOLDOWN_MS - timeFromLastRequest;
    const seconds = Math.ceil(waitTime / 1000);

    await setStatus("Waiting " + seconds + " seconds to avoid sending requests too quickly...");
    await sleep(waitTime);
  }

  lastJinaRequestTime = Date.now();

  const jinaUrl = "https://r.jina.ai/" + url;

  const response = await fetch(jinaUrl, {
    method: "GET"
  });

  const text = await response.text();

  if (
    !response.ok ||
    text.includes("DDoS attack suspected") ||
    text.includes("Too many requests") ||
    text.includes("Rate limit")
  ) {
    await chrome.storage.local.set({
      [errorCooldownKey]: Date.now() + JINA_ERROR_COOLDOWN_MS
    });

    throw new Error(
      "Jina blocked the request as too frequent. Wait about 2 minutes.\n\nResponse:\n" +
      text.slice(0, 500)
    );
  }

  if (!text || text.trim().length < 50) {
    throw new Error("Jina returned empty or too short content.");
  }

  await chrome.storage.local.set({
    [cacheKey]: text
  });

  return text;
}

async function analyzeWithGemini(data) {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const policyText = data.policyText.slice(0, 60000);

  const prompt = `
Przeanalizuj poniższą politykę prywatności / EULĘ i oceń, jak etyczna jest wobec użytkownika.

Oceń w skali od 1 do 100:
- 1 = bardzo nieetyczna, niejasna, agresywna wobec prywatności użytkownika
- 100 = bardzo etyczna, przejrzysta, uczciwa, dająca użytkownikowi kontrolę

Zwróć odpowiedź dokładnie w takim formacie:

Label:
Jedna z dokładnie tych etykiet: Dangerous! / Suspicious / Moderate / Low threat

Score:
XX/100

Explanation:
Twoje uzasadnienie po angielsku, ma byc krotkie i zwięzłe, zrozumiałe dla usera, postaraj się podać tylko najważniejsze informacje.

Educational note:
Jedna krótka lekcja dla użytkownika: wyjaśnij prostym językiem, czego ta polityka uczy o prywatności online albo na co użytkownik powinien zwracać uwagę w podobnych dokumentach.

User tip:
Jedna praktyczna rada, co użytkownik może zrobić, np. sprawdzić ustawienia prywatności, ograniczyć personalizację reklam, pobrać dane, usunąć historię aktywności, wyłączyć śledzenie poza aplikacją.

Nie dodawaj żadnego markdowna.
Nie dodawaj JSON-a.
Nie dodawaj innych sekcji.

TEKST POLITYKI:
${policyText}
`;

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    console.log("Gemini raw response:", json);

    if (!response.ok) {
      throw new Error(
        "Gemini API returned HTTP error " +
        response.status +
        ": " +
        JSON.stringify(json).slice(0, 1000)
      );
    }

    if (!json.candidates || !json.candidates[0]) {
      throw new Error(
        "Gemini did not return a response. Response: " +
        JSON.stringify(json).slice(0, 1000)
      );
    }

    const resultText = json.candidates[0].content.parts[0].text;

    console.log("===== WYNIK GEMINI =====");
    console.log(resultText);
    console.log("===== KONIEC WYNIKU GEMINI =====");

    return resultText;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("The Gemini request took too long and was aborted after 60 seconds.");
    }

    throw error;
  }
}

async function saveAnalysisToTxt(analysis) {
  const dataUrl = "data:text/plain;charset=utf-8," + encodeURIComponent(analysis);

  await chrome.downloads.download({
    url: dataUrl,
    filename: "wynik.txt",
    saveAs: true
  });
}

function makeCacheKey(url) {
  return "jina_cache_" + simpleHash(url);
}

function simpleHash(text) {
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }

  return Math.abs(hash).toString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setStatus(status) {
  const payload = {
    analyzeStatus: status
  };

  if (activeAnalysisPage) {
    payload.analyzeStatusPage = activeAnalysisPage;
  }

  await chrome.storage.local.set(payload);
}
