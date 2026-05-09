const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const scanPanel = document.getElementById("scanPanel");
const accountDiv = document.getElementById("account");
const scanBtn = document.getElementById("scanBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusDiv = document.getElementById("status");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginBtn.disabled = true;

  try {
    setStatus("Loguję...");

    const response = await chrome.runtime.sendMessage({
      action: "login",
      data: {
        email: emailInput.value,
        password: passwordInput.value
      }
    });

    if (!response || !response.success) {
      setStatus(response?.error || "Nie udało się zalogować.");
      return;
    }

    passwordInput.value = "";
    await refreshAuthState();
    setStatus("Zalogowano. Nowe strony będą sprawdzane automatycznie.");
  } catch (error) {
    console.error(error);
    setStatus("Błąd: " + error.message);
  } finally {
    loginBtn.disabled = false;
  }
});

scanBtn.addEventListener("click", async () => {
  scanBtn.disabled = true;

  try {
    setStatus("Pobieram dane aktywnej strony...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      setStatus("Nie udało się odczytać aktywnej karty.");
      return;
    }

    if (!isScannableUrl(tab.url)) {
      setStatus("Na tej stronie rozszerzenie nie może działać.");
      return;
    }

    const pageData = await collectPageData(tab.id);

    const response = await chrome.runtime.sendMessage({
      action: "startBackendScan",
      data: pageData
    });

    if (!response || !response.success) {
      setStatus(response?.error || "Nie udało się uruchomić analizy.");
      return;
    }

    setStatus(formatScanResult(response.result));
  } catch (error) {
    console.error(error);
    setStatus("Błąd: " + error.message);
  } finally {
    scanBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "logout"
    });

    if (!response || !response.success) {
      setStatus(response?.error || "Nie udało się wylogować.");
      return;
    }

    await refreshAuthState();
  } catch (error) {
    console.error(error);
    setStatus("Błąd: " + error.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

async function collectPageData(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "collectPageData"
    });

    if (response && response.success) {
      return {
        url: response.url,
        domContent: response.domContent
      };
    }
  } catch (error) {
    console.log("Content script nie był aktywny. Wstrzykuję content.js...");
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  const injectedResponse = await chrome.tabs.sendMessage(tabId, {
    action: "collectPageData"
  });

  if (!injectedResponse || !injectedResponse.success) {
    throw new Error("Nie udało się zebrać danych strony.");
  }

  return {
    url: injectedResponse.url,
    domContent: injectedResponse.domContent
  };
}

async function refreshAuthState() {
  const [auth, latestScan] = await Promise.all([
    chrome.runtime.sendMessage({ action: "getAuthState" }),
    chrome.runtime.sendMessage({ action: "getLatestScan" })
  ]);

  const loggedIn = Boolean(auth?.loggedIn);

  loginForm.classList.toggle("hidden", loggedIn);
  scanPanel.classList.toggle("hidden", !loggedIn);
  accountDiv.textContent = loggedIn ? "Zalogowano jako " + auth.email : "";

  if (latestScan?.status) {
    setStatus(latestScan.status);
  }
}

function setStatus(text) {
  statusDiv.textContent = text;
}

function formatScanResult(result) {
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

refreshAuthState();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes.analyzeStatus) {
    setStatus(changes.analyzeStatus.newValue);
  }
});
